require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();

// Direct Native CORS Array Configuration
app.use(cors({
  origin: [
    'https://e-commerce-localizer.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
// end new add

// Health Check Route
app.get('/api/v1/health', async (req, res) => {
  try {
    const { error } = await supabase.from('localized_products').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'success', message: 'Backend & Supabase connected successfully!' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==========================================
// 1. Localization API Route
// ==========================================
app.post('/api/v1/localize', async (req, res) => {
  try {
        const { title, description, targetLanguage, targetMarket } = req.body;

    // Verify logged-in user from Supabase token (do not trust email from body)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Login required.' });
    }

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user?.email) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired session. Please login again.' });
    }
    const userEmail = userData.user.email;
    
    if (!title || !description || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, description, and targetLanguage are required.' 
      });
    }

       // Free User & Pro Status Check (daily limit, UTC date)
    const todayStr = new Date().toISOString().slice(0, 10);
    let isProUser = false;
    let usedToday = 0;

    if (userEmail) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, is_pro, credits_used, last_credit_date')
        .eq('email', userEmail)
        .maybeSingle();

      if (profileError) {
        console.error('Profile select error:', profileError.message);
        return res.status(500).json({
          status: 'error',
          message: 'Could not read profile: ' + profileError.message
        });
      }

      if (!profile) {
        console.error('No profile row found for:', userEmail);
        return res.status(404).json({
          status: 'error',
          message: 'Profile not found. Please logout and login again.'
        });
      }

      isProUser = profile.is_pro === true;
      usedToday = profile.last_credit_date === todayStr ? (profile.credits_used || 0) : 0;

      if (!isProUser && usedToday >= 3) {
        return res.status(403).json({
          status: 'limit_exceeded',
          message: 'Daily free limit reached (3/3). Upgrade to Pro Unlimited or come back tomorrow.'
        });
      }
    }

    // UPDATED PROMPT: Direct Translation Instruction into Target Language
    const prompt = `You are an expert e-commerce copywriter.
Translate and culturally adapt the following product copy into ${targetLanguage} specifically for the ${targetMarket || 'General Market'}.

Product Title: ${title}
Product Description: ${description}

STRICT RULE: Output MUST be a valid JSON object only. Do NOT add markdown tags, intro, or outro.

JSON Schema:
{
  "localizedTitle": "Write localized title in ${targetLanguage}",
  "localizedDescription": "Write rich localized description in ${targetLanguage}",
  "culturalNotes": "Write key cultural insights in ${targetLanguage}"
}`;

    const modelName = isProUser
      ? (process.env.AI_MODEL_PRO || 'claude-sonnet-5-5')
      : (process.env.AI_MODEL_FREE || 'claude-haiku-5-5');

    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    });

    const rawText = response.content[0]?.text || '';

    // Advanced JSON Sanitizer
    let cleanJsonString = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Extract JSON object if Claude wraps text around it
    const jsonMatch = cleanJsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJsonString = jsonMatch[0];
    }

    let parsedData = {};
    try {
      parsedData = JSON.parse(cleanJsonString);
    } catch (e) {
      console.error("JSON Parse Error, using raw fallbacks:", e.message);
      parsedData = { 
        localizedTitle: title,
        localizedDescription: rawText,
        culturalNotes: "Adapted for local context."
      };
    }

    const finalResult = {
      localizedTitle: parsedData.localizedTitle || parsedData.title || title,
      localizedDescription: parsedData.localizedDescription || parsedData.description || rawText,
      culturalNotes: parsedData.culturalNotes || parsedData.notes || "Adapted for target market."
    };

    // Save generated product to database history
    await supabase.from('localized_products').insert([
      {
        original_title: title,
        original_description: description,
        target_language: targetLanguage,
        target_market: targetMarket || 'General Audience',
        localized_title: finalResult.localizedTitle,
        localized_description: finalResult.localizedDescription,
        cultural_notes: finalResult.culturalNotes
      }
    ]);

    // Increment credits_used if it's a free user
    if (userEmail && !isProUser) {
      const { data: updatedRows, error: updateError } = await supabase
        .from('profiles')
        .update({ credits_used: usedToday + 1, last_credit_date: todayStr })
        .eq('email', userEmail)
        .select('credits_used');

      if (updateError) {
        console.error('Credits update error:', updateError.message);
      } else if (!updatedRows || updatedRows.length === 0) {
        console.error('Credits update touched 0 rows (RLS block ba email mile nai) for:', userEmail);
      }
    }

    // Send formatted result to Frontend
    res.json({
      status: 'success',
      isPro: isProUser,
      data: finalResult
    });

  } catch (err) {
    console.error('AI Localization Error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==========================================
// 2. Lemon Squeezy Webhook Endpoint
// ==========================================
app.post('/api/v1/webhook/lemonsqueezy', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());
    const eventName = event.meta.event_name;

    console.log(`💳 Received Lemon Squeezy Event: ${eventName}`);

    if (eventName === 'order_created' || eventName === 'subscription_created') {
      const userEmail = event.data.attributes.user_email;
      console.log(`🎉 Pro Upgrade Successful for: ${userEmail}`);

      await supabase
        .from('profiles')
        .update({ is_pro: true })
        .eq('email', userEmail);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Server Startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running smoothly on port ${PORT}`);
});