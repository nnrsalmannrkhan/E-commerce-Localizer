require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
    const { title, description, targetLanguage, targetMarket, userEmail } = req.body;

    if (!title || !description || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, description, and targetLanguage are required.' 
      });
    }

    // Free User & Pro Status Check
    let isProUser = false;
    if (userEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (profile) {
        isProUser = profile.is_pro;
        if (!isProUser && profile.credits_used >= 3) {
          return res.status(403).json({
            status: 'limit_exceeded',
            message: 'Free limit reached (3/3). Please upgrade to Pro Unlimited to continue.'
          });
        }
      } else {
        await supabase.from('profiles').insert([{ email: userEmail, is_pro: false, credits_used: 0 }]);
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

    const modelName = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';

    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 1500,
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
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('credits_used')
        .eq('email', userEmail)
        .single();
      
      const newCount = (currentProfile?.credits_used || 0) + 1;
      await supabase
        .from('profiles')
        .update({ credits_used: newCount })
        .eq('email', userEmail);
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