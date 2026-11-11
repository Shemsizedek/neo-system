import { generateText } from 'ai';

async function main() {
  const { text } = await generateText({
    model: 'moonshotai/kimi-k3',
    prompt: 'Invent a new holiday and describe its traditions.',
  });

  if (!text.trim()) {
    throw new Error('AI Gateway returned no generated text.');
  }

  console.log(text);
}

main().catch(() => {
  console.error('Holiday generation failed. Check credentials, model access, and network connectivity.');
  process.exitCode = 1;
});
