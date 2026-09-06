async function runFinalScript() {
  const convId = 'final_script_eval_' + Date.now();
  const script = [
    'Hello',
    'Gujarat ka capital kya hai?',
    "What's up?",
    "Can you tell me what's happening in the news right now?",
    'Actually, Hindi mein batao.',
    'Aur Gujarat mein kya chal raha hai?',
    'Okay, thanks.'
  ];

  for (let i = 0; i < script.length; i++) {
    const q = script[i];
    const res = await fetch('http://127.0.0.1:5000/api/conversation/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ utterance: q, conversationId: convId })
    });
    const data = await res.json();
    console.log('Turn ' + (i + 1) + ' User: "' + q + '"');
    console.log('Turn ' + (i + 1) + ' AI: ' + data.reply);
    if (data.sources && data.sources.length > 0) {
      console.log('Turn ' + (i + 1) + ' Sources (' + data.sources.length + '): ' + data.sources.map(s => '[' + s.publisher + '] ' + s.title).join(' | '));
    }
    console.log('---------------------------------------------------------');
  }
}

runFinalScript().catch(console.error);
