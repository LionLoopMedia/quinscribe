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

Task: Create a detailed SOP in Markdown format from the following voice input, which contains steps outlining a process. Any URLs in parentheses MUST be included in the output.

Formatting Rules:
1. Structure (CRITICAL - NO EXCEPTIONS):
   - ONLY use H2 (##) for major steps - NEVER use H3 or deeper headers
   - Use nested bullets (indented -) for any further details or sub-substeps
2. Link Handling (CRITICAL - NO EXCEPTIONS):
   - EVERY URL in parentheses MUST appear in the output - NO EXCEPTIONS
   - First try to integrate URLs naturally into the text as markdown links
   - Example: "Check analytics (https://analytics.google.com)" becomes "Check [Google Analytics](https://analytics.google.com)"
   - If a URL cannot be integrated naturally, append it at the end of its relevant step as "(See: [Resource](url))"
   - Never omit any URLs, even if they seem redundant or unnecessary
   - Every step that had a URL in the input must either:
     a) Include the URL as a natural inline link, OR
     b) Have the URL appended at the end as "(See: [Resource](url))"
3. Content Guidelines:
   - Convert all bullet points into clear, actionable instructions
   - Put file names, variables, and commands in \`code\` format
   - Keep instructions concise but comprehensive

Here is the voice input to convert into an SOP:

${text}

Remember:
- EVERY single URL from the input MUST appear in the output
- If you can't integrate a URL naturally, append it as "(See: [Resource](url))"
- Never discard or omit any URLs from the input`;

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