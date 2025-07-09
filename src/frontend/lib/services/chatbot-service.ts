/**
 * Chatbot service for interacting with Azure OpenAI and related services
 */

import { apiRequest, ApiResponse } from './api-client';

// Message types
export interface Message {
  id: string;
  type: 'user' | 'ai' | 'quiz' | 'flashcard';
  content: string;
  timestamp: Date | string;
  attachments?: string[];
  quizData?: QuizQuestion;
  flashcardData?: FlashcardData;
}

// Quiz question interface
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

// Flashcard data interface
export interface FlashcardData {
  frontText: string;
  backText: string;
  tags: string[];
}

// Chat history params
export interface ChatHistoryParams {
  courseId?: string;
  limit?: number;
  userId?: string;
}

// Chat completion response
export interface ChatCompletionResponse {
  message: Message;
  relevantDocuments?: {
    id: string;
    name: string;
    url: string;
    relevanceScore: number;
  }[];
}

/**
 * Send a message to the chatbot and get a response
 */
export async function sendChatMessage(
  message: string,
  conversation: Message[],
  courseId?: string
): Promise<ApiResponse<ChatCompletionResponse>> {
  return apiRequest<ChatCompletionResponse>(
    '/api/ChatCompletion',
    {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation,
        courseId,
      }),
    }
  );
}

/**
 * Get chat history for a user
 */
export async function getChatHistory(
  params: ChatHistoryParams
): Promise<ApiResponse<{
  conversations: {
    id: string;
    title: string;
    lastMessagePreview: string;
    lastMessageTime: string;
    messageCount: number;
  }[]
}>> {
  const queryParams = new URLSearchParams();
  if (params.courseId) {
    queryParams.append('courseId', params.courseId);
  }
  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  
  return apiRequest<{
    conversations: {
      id: string;
      title: string;
      lastMessagePreview: string;
      lastMessageTime: string;
      messageCount: number;
    }[]
  }>(`/api/ChatHistory?${queryParams.toString()}`);
}

/**
 * Get quiz questions based on a topic
 */
export async function generateQuiz(
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  questionCount: number = 5
): Promise<ApiResponse<{
  topic: string;
  difficulty: string;
  questions: QuizQuestion[];
}>> {
  return apiRequest<{
    topic: string;
    difficulty: string;
    questions: QuizQuestion[];
  }>(
    '/api/GenerateQuiz',
    {
      method: 'POST',
      body: JSON.stringify({
        topic,
        difficulty,
        questionCount,
      }),
    }
  );
}

/**
 * Generate flashcards for a topic
 */
export async function generateFlashcards(
  topic: string,
  count: number = 5
): Promise<ApiResponse<{
  topic: string;
  flashcards: FlashcardData[];
}>> {
  return apiRequest<{
    topic: string;
    flashcards: FlashcardData[];
  }>(
    '/api/GenerateFlashcards',
    {
      method: 'POST',
      body: JSON.stringify({
        topic,
        count,
      }),
    }
  );
}
