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

main().catch((error) => {
  console.error('Holiday generation failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
