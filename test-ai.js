const testLocalization = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/v1/localize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: "Ergonomic Office Chair",
        description: "High back mesh chair with lumbar support and adjustable armrests.",
        targetLanguage: "Bengali",
        targetMarket: "Bangladesh"
      })
    });

    const data = await response.json();
    console.log("=== AI Localization Result ===");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Test Error:", error.message);
  }
};

testLocalization();