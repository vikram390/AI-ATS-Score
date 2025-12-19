
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { AtsResult } from '../models/ats-result.model';

// This is needed for process.env.API_KEY
declare const process: any;

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  private createPrompt(jobDescription: string, mode: 'single' | 'bulk'): string {
    if (mode === 'single') {
      return `
        You are 'ResumeCoach AI', an expert career coach specializing in resume optimization. 
        Your goal is to help job seekers improve their resumes to pass modern Applicant Tracking Systems (ATS) and catch a recruiter's eye. 
        Analyze the provided resume with a constructive and encouraging tone.

        **Resume:**
        [Resume content is provided as an inline part]

        **Instructions:**
        1.  **Score:** Rate the resume on a scale of 0 to 100 based on its overall quality, clarity, structure, and ATS-friendliness.
        2.  **Summary:** Write an encouraging summary of the candidate's professional story as told by the resume.
        3.  **Pros:** List the resume's key strengths. Be specific about what makes these elements strong (e.g., "Quantifiable achievement in sales growth").
        4.  **Cons:** Frame these as 'Actionable Improvements'. List weaknesses or areas for improvement and provide specific, helpful suggestions on how to fix them (e.g., "Instead of 'Managed a team', try 'Led a team of 5 engineers to deliver Project X, increasing efficiency by 15%'").

        Return ONLY the JSON object. Do not include any other text or markdown formatting.
      `;
    }

    // Bulk Mode
    if (jobDescription) {
      return `
        You are 'RecruiterBot 9000', a high-performance ATS designed for rapid candidate shortlisting. 
        Your task is to be objective, fast, and ruthless in your evaluation of the provided resume against the specific job description.

        **Job Description:**
        ${jobDescription}

        **Resume:**
        [Resume content is provided as an inline part]

        **Instructions:**
        1.  **Score:** Rate the resume from 0 to 100 based *strictly* on its alignment with the job description. Do not consider other factors.
        2.  **Summary:** Provide a 1-2 sentence 'elevator pitch' for this candidate's fit for the role, justifying your score directly. Be direct and concise.

        Return ONLY the JSON object. Do not include any other text or markdown formatting.
      `;
    }

    // Bulk Mode without Job Description
    return `
      You are 'RecruiterBot 9000', a high-performance ATS designed for rapid candidate screening. 
      Your task is to perform a general, high-level analysis of the provided resume.

      **Resume:**
      [Resume content is provided as an inline part]

      **Instructions:**
      1.  **Score:** Provide a general ATS compatibility score from 0 to 100.
      2.  **Summary:** Write a one-sentence professional headline for this candidate.

      Return ONLY the JSON object. Do not include any other text or markdown formatting.
    `;
  }

  private createSchema(mode: 'single' | 'bulk'): any {
    if (mode === 'single') {
      return {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: 'Overall ATS score from 0 to 100.' },
          summary: { type: Type.STRING, description: 'An encouraging summary of the candidate.' },
          pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Strengths of the resume.' },
          cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Actionable improvements for the resume.' },
        },
        required: ['score', 'summary', 'pros', 'cons'],
      };
    }
    
    // Bulk mode (with or without job description)
    return {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: 'Score from 0 to 100 based on the analysis.' },
        summary: { type: Type.STRING, description: 'A brief summary justifying the score.' },
      },
      required: ['score', 'summary'],
    };
  }

  private _parseGeminiError(error: any): string {
    const defaultMessage = 'The AI model could not process the request. The file might be unreadable or the content was flagged.';
    
    if (!error || !error.message) {
      return defaultMessage;
    }

    const errorMessage = (error.message as string).toLowerCase();

    if (errorMessage.includes('api key not valid')) {
      return 'The API Key is not valid. Please ensure it is configured correctly.';
    }
    if (errorMessage.includes('quota')) {
      return 'API quota exceeded. Please check your Google AI project limits and billing status.';
    }
    if (errorMessage.includes('billing')) {
      return 'Billing is not enabled for the project. Please enable billing in your Google Cloud console.';
    }
    if (errorMessage.includes('safety')) {
      return 'The request was blocked due to safety settings. The resume content may have been flagged as inappropriate.';
    }
    if (error instanceof SyntaxError) {
      return 'The AI returned a response that was not in the expected format. Please try again.';
    }

    return defaultMessage;
  }

  async analyzeResume(jobDescription: string, resumeContent: string, resumeMimeType: string, mode: 'single' | 'bulk'): Promise<AtsResult> {
    const prompt = this.createPrompt(jobDescription, mode);
    const schema = this.createSchema(mode);

    const resumePart = {
      inlineData: {
        data: resumeContent,
        mimeType: resumeMimeType,
      },
    };

    const textPart = { text: prompt };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, resumePart] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      const jsonString = response.text;
      const result = JSON.parse(jsonString);
      return result as AtsResult;
    } catch (error) {
      console.error('Error analyzing resume with Gemini:', error);
      const userFriendlyError = this._parseGeminiError(error);
      throw new Error(userFriendlyError);
    }
  }
}
