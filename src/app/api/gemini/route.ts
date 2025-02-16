import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { text } = await req.json();
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `You are an expert SOP Creator, specializing in generating detailed Standard Operating Procedures (SOPs) in Markdown format for digital marketing and online entrepreneurship tasks.

Task: Create a detailed SOP in Markdown format from the following voice input, which contains steps outlining a process.

Formatting Rules:
1. Structure (CRITICAL - NO EXCEPTIONS):
   - ONLY use H2 (##) for major steps - NEVER use H3 or deeper headers
   - Use bullet points (-) for substeps
   - Use nested bullets (indented -) for any further details or sub-substeps
   - All hierarchical information should be represented through bullet point nesting, not header levels
2. Link Handling (CRITICAL - NO EXCEPTIONS):
   - ONLY use markdown links that are present in the input text - NEVER add new links
   - NEVER create or suggest additional links that weren't in the original input
   - Try to integrate the input's existing links naturally into the relevant step first
   - If an input link can be naturally placed, use descriptive anchor text while keeping the original link (e.g., "Configure settings in [the admin panel](original-link-from-input)")
   - If an input link cannot be naturally integrated into the step, it MUST be appended at the end of that step in parentheses with "(See more: [Additional Resource](original-link-from-input))"
   - Every markdown link from the input MUST appear somewhere in the output, either integrated or appended
   - Links should be placed with their relevant step, not at the end of the entire document
   - The only markdown links in the output should be those that were present in the input
3. Content Guidelines:
   - Convert all bullet points into clear, actionable instructions
   - Put file names, variables, and commands in \`code\` format
   - Keep instructions concise but comprehensive

Here is the voice input to convert into an SOP:

${text}

Remember:
- ONLY use H2 (##) for headings, never deeper levels
- Use nested bullet points for all hierarchical information
- ONLY use markdown links from the input - never add new ones
- EVERY markdown link from the input must be included - either naturally in the text or appended to its relevant step
- Keep the original markdown link format and URLs exactly as they appear in the input`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const formattedResponse = response.text();

    return NextResponse.json({ content: formattedResponse });
  } catch (error) {
    console.error('Error processing Gemini request:', error);
    return NextResponse.json(
      { error: 'Failed to process the text' },
      { status: 500 }
    );
  }
} 