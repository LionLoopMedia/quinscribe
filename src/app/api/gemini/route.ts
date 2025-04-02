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

    const { text, mode = 'sop' } = await req.json().catch(() => ({}));
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro-exp-03-25' });
      
      // If this is a validation request (text is "Test."), return success immediately
      if (text === 'Test.') {
        return NextResponse.json({ content: 'API key is valid' });
      }

      let prompt;
      
      if (mode === 'guide') {
        prompt = `You are an expert Guide Creator, specializing in generating helpful, conversational guides in Markdown format for digital marketing and online entrepreneurship topics.

Task: Create a comprehensive guide in Markdown format from the following voice input. Any URLs in parentheses MUST be included in the output.

IMPORTANT: Do NOT wrap the entire output in markdown code block delimiters (\`\`\`markdown). Just output the raw markdown content directly.

Formatting Rules:
1. Structure (CRITICAL - NO EXCEPTIONS):
   - Use H2 (##) for main section headings. Unlike SOPs, section headings should NOT be in imperative form, but rather descriptive (e.g., "Understanding Email Marketing" instead of "Set Up Email Marketing")
   - ALWAYS use bullet points with hyphens (-) for ALL steps and substeps - NEVER use plain text for steps
   - All steps MUST start with a hyphen (-) and have proper indentation for hierarchy
   - Indent substeps with two spaces under their parent step
   - Example structure:
     ## Understanding the Process
     - Here's what you need to know about the first aspect of this topic
       - Important concept 1.1: Explanation of the first concept
       - Important concept 1.2: Explanation of the second concept
     - Here's how the second aspect works in practice
   - NEVER skip the hyphens for any step or substep
   - ALWAYS indent code blocks and markdown content with 4 spaces under their respective steps
   - When including code examples or markdown content:
     a) Add a blank line before the content
     b) Indent EVERY line with 4 spaces
     c) Add a blank line after the content
     d) Example:
        - Here's an example of how this works:

            \`\`\`javascript
            const example = "code";
            console.log(example);
            \`\`\`

        - The explanation continues here...
2. Link Handling (CRITICAL - NO EXCEPTIONS):
   - EVERY URL in parentheses MUST appear in the output - NO EXCEPTIONS
   - ALWAYS convert URLs into descriptive markdown links - NEVER leave raw URLs
   - For each URL in parentheses:
     a) Create a descriptive anchor text based on the URL's purpose or destination
     b) Format as [Descriptive Text](url)
     c) Example: "(https://analytics.google.com)" becomes "[Google Analytics Dashboard](https://analytics.google.com)"
     d) Example: "(https://example.com/docs)" becomes "[Documentation](https://example.com/docs)"
   - If a URL cannot be integrated naturally into a step, append it with a descriptive anchor:
     "(See: [Resource Name or Description](url))"
   - NEVER use generic anchor text like "link" or "click here"
   - NEVER make up your own URLs, only use the ones provided in the input.
   - Every step that had a URL in the input must either:
     a) Include the URL as a natural inline markdown link with descriptive anchor text, OR
     b) Have the URL appended at the end as "(See: [Descriptive Name](url))"
3. Content Guidelines for Guides:
   - Begin with a brief introduction explaining the topic and its importance
   - Write in a helpful, conversational tone that explains concepts clearly
   - Focus on the "why" behind processes as well as the "how"
   - Use explanatory language rather than commands
   - Include tips, examples, and best practices
   - Put file names, variables, and commands in \`code\` format
   - End with a brief conclusion or summary
   - CRITICAL: All code blocks, command examples, and markdown content MUST be indented with 4 spaces
   - Example of proper formatting:
     ## Understanding Configuration Files
     - Configuration files control how your application behaves:

         \`\`\`json
         {
           "setting": "value"
         }
         \`\`\`

     - When setting up your configuration, consider these best practices...

Here is the voice input to convert into a guide:

${text}

Remember:
- Make the guide informative and helpful while following the exact formatting rules above
- EVERY URL from the input MUST appear in the output as a markdown link with descriptive anchor text
- If you can't integrate a URL naturally, append it as "(See: [Descriptive Name](url))"
- CRITICAL: All steps MUST start with a hyphen (-) and proper indentation for hierarchy
- CRITICAL: All code blocks, command examples, and markdown content MUST be indented with 4 spaces under their steps
- Always add blank lines before and after indented content`;
      } else {
        // Default to SOP mode
        prompt = `You are an expert SOP Creator, specializing in generating detailed Standard Operating Procedures (SOPs) in Markdown format for digital marketing and online entrepreneurship tasks.

Task: Create a detailed SOP in Markdown format from the following voice input, which contains steps outlining a process. Any URLs in parentheses MUST be included in the output.

IMPORTANT: Do NOT wrap the entire output in markdown code block delimiters (\`\`\`markdown). Just output the raw markdown content directly.

Formatting Rules:
1. Structure (CRITICAL - NO EXCEPTIONS):
   - Use H2 (##) for main section headings
   - ALWAYS use bullet points with hyphens (-) for ALL steps and substeps - NEVER use plain text for steps
   - All steps MUST start with a hyphen (-) and have proper indentation for hierarchy
   - Indent substeps with two spaces under their parent step
   - Example structure:
     ## Main Section Heading
     - Description of the first major step
       - Substep 1.1: First substep under Step 1
       - Substep 1.2: Second substep under Step 1
     - Description of the second major step
   - NEVER skip the hyphens for any step or substep
   - ALWAYS indent code blocks and markdown content with 4 spaces under their respective steps
   - When including code examples or markdown content:
     a) Add a blank line before the content
     b) Indent EVERY line with 4 spaces
     c) Add a blank line after the content
     d) Example:
        - Here's the step description:

            \`\`\`javascript
            const example = "code";
            console.log(example);
            \`\`\`

        - Next step continues here...
2. Link Handling (CRITICAL - NO EXCEPTIONS):
   - EVERY URL in parentheses MUST appear in the output - NO EXCEPTIONS
   - ALWAYS convert URLs into descriptive markdown links - NEVER leave raw URLs
   - For each URL in parentheses:
     a) Create a descriptive anchor text based on the URL's purpose or destination
     b) Format as [Descriptive Text](url)
     c) Example: "(https://analytics.google.com)" becomes "[Google Analytics Dashboard](https://analytics.google.com)"
     d) Example: "(https://example.com/docs)" becomes "[Documentation](https://example.com/docs)"
   - If a URL cannot be integrated naturally into a step, append it with a descriptive anchor:
     "(See: [Resource Name or Description](url))"
   - NEVER use generic anchor text like "link" or "click here"
   - NEVER make up your own URLs, only use the ones provided in the input.
   - Every step that had a URL in the input must either:
     a) Include the URL as a natural inline markdown link with descriptive anchor text, OR
     b) Have the URL appended at the end as "(See: [Descriptive Name](url))"
3. Content Guidelines:
   - Convert all instructions into clear, actionable numbered bullet points
   - Use hyphens (-) for sub-bullet points - NEVER use asterisks (*)
   - Put file names, variables, and commands in \`code\` format
   - Keep instructions concise but comprehensive
   - CRITICAL: All code blocks, command examples, and markdown content MUST be indented with 4 spaces
   - Example of proper formatting:
     ## Section Title
     - This step requires running a command:

         \`npm install package-name\`

     - Then configure the settings:

         \`\`\`json
         {
           "setting": "value"
         }
         \`\`\`

Here is the voice input to convert into an SOP:

${text}

Remember:
- EVERY single URL from the input MUST appear in the output as a markdown link with descriptive anchor text
- If you can't integrate a URL naturally, append it as "(See: [Descriptive Name](url))"
- Never discard or omit any URLs from the input
- CRITICAL: All steps MUST start with a hyphen (-) and proper indentation for hierarchy
- CRITICAL: All code blocks, command examples, and markdown content MUST be indented with 4 spaces under their steps
- Always add blank lines before and after indented content`;
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const formattedResponse = response.text();

      return NextResponse.json({ content: formattedResponse });
    } catch (error: any) {
      console.error('Error with Gemini API:', error);
      
      // Check for specific Gemini API errors
      const errorMessage = error.message || 'Failed to process with Gemini API';
      
      if (errorMessage.includes('API key not valid')) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your Gemini API key.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process the request' },
      { status: 500 }
    );
  }
} 