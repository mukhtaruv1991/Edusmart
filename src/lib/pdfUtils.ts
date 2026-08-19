import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  // Extract text from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
    
    // Safety check: if text gets too large (approaching 1MB limit for Firestore)
    // We'll truncate it to avoid Firestore errors. 
    // 1MB is roughly 1,000,000 characters (assuming 1 byte per char, but UTF-8 can be more).
    // Let's limit to 500,000 characters to be safe.
    if (fullText.length > 500000) {
      fullText = fullText.substring(0, 500000) + '\n...[Text truncated due to size limits]';
      break;
    }
  }
  
  return fullText;
}
