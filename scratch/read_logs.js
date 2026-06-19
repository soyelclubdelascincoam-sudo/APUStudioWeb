import fs from 'fs';
import readline from 'readline';

async function searchStep239() {
  const logFile = 'C:\\Users\\Usuario\\.gemini\\antigravity-ide\\brain\\1afc52d2-91a0-4d08-8121-9f71ced0ff9d\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.step_index >= 238 && parsed.step_index <= 242) {
        console.log(`\n================ STEP ${parsed.step_index} (${parsed.type}) ================`);
        console.log("Content:", parsed.content);
        if (parsed.tool_calls) {
          console.log("Tool Calls:", JSON.stringify(parsed.tool_calls, null, 2));
        }
      }
    } catch (e) {
      // Ignore
    }
  }
}

searchStep239();
