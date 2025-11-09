import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

/**
 * Initialize Gemini AI
 */
function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in .env file');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  });
}

/**
 * Generate a professional CV based on user answers
 * @param {Object} answers - User answers to 6 questions
 * @param {String} answers.currentRole - Current or most recent job role
 * @param {String} answers.topSkills - Top 3 professional skills
 * @param {String} answers.targetPosition - Position seeking
 * @param {String} answers.achievements - Significant professional achievements
 * @param {String} answers.education - Educational background
 * @param {String} answers.additional - Additional information (optional)
 * @returns {Object} Generated CV data
 */
export async function generateCV(answers) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY not configured, cannot generate CV');
      throw new Error('Servicio de IA no configurado');
    }

    logger.info('Generating CV with Gemini', { role: answers.currentRole });

    const model = getGeminiModel();

    // Build comprehensive prompt
    const prompt = `Actúa como un experto en recursos humanos y redacción de CVs profesionales. Genera un currículum vitae profesional y convincente en español basado en la siguiente información:

**Información del candidato:**
- Rol actual/reciente: ${answers.currentRole || 'No especificado'}
- Habilidades principales: ${answers.topSkills || 'No especificado'}
- Posición buscada: ${answers.targetPosition || 'No especificado'}
- Logros profesionales: ${answers.achievements || 'No especificado'}
- Formación académica: ${answers.education || 'No especificado'}
- Información adicional: ${answers.additional || 'No especificado'}

**Instrucciones de generación:**
1. Crea un resumen profesional impactante de 2-3 oraciones que destaque el valor único del candidato
2. Expande la experiencia laboral con responsabilidades y logros específicos
3. Organiza las habilidades por categorías relevantes para el rol
4. Detalla la formación académica de manera profesional
5. Incluye la información adicional de forma relevante (certificaciones, idiomas, etc.)

**IMPORTANTE:** Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código, solo el JSON puro) con esta estructura exacta:

{
  "professionalSummary": "Resumen profesional convincente de 2-3 oraciones que destaque el valor del candidato",
  "experience": [
    {
      "title": "Título del cargo",
      "company": "Nombre de la empresa/organización",
      "description": "Descripción detallada de responsabilidades y logros (mínimo 100 caracteres, máximo 300)"
    }
  ],
  "skills": [
    "Habilidad 1",
    "Habilidad 2",
    "Habilidad 3"
  ],
  "education": [
    {
      "degree": "Título académico",
      "institution": "Institución educativa",
      "description": "Breve descripción o especialización (opcional)"
    }
  ],
  "languages": [
    {
      "name": "Nombre del idioma",
      "level": "Nivel (básico, intermedio, avanzado, nativo)"
    }
  ],
  "additional": "Información adicional relevante como certificaciones, cursos, intereses profesionales (si aplica)"
}

**Reglas estrictas:**
- Usa un tono profesional pero accesible
- Sé específico y concreto en las descripciones
- Incluye al menos 2-3 habilidades relevantes
- Si falta información, infiere de forma lógica basándote en el contexto del rol
- NO inventes datos falsos, usa la información proporcionada como base
- El JSON debe ser válido y parseable
- NO incluyas comentarios en el JSON
- NO uses bloques de código markdown`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    logger.debug('Raw Gemini CV response', { text: text.substring(0, 200) });

    // Clean response (remove markdown code blocks if present)
    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse JSON response
    let cvData;
    try {
      cvData = JSON.parse(text);
    } catch (parseError) {
      logger.error('Failed to parse Gemini CV response', {
        error: parseError.message,
        response: text.substring(0, 500)
      });
      throw new Error('No se pudo procesar la respuesta de la IA');
    }

    // Validate response structure
    if (!cvData.professionalSummary || !Array.isArray(cvData.skills)) {
      logger.error('Invalid CV data structure', { cvData });
      throw new Error('Respuesta de IA en formato inválido');
    }

    // Ensure arrays exist
    cvData.experience = cvData.experience || [];
    cvData.education = cvData.education || [];
    cvData.skills = cvData.skills || [];
    cvData.languages = cvData.languages || [];

    logger.info('CV generated successfully', {
      skillsCount: cvData.skills.length,
      experienceCount: cvData.experience.length
    });

    return cvData;
  } catch (error) {
    logger.error('Error generating CV with Gemini', { error: error.message });
    throw error;
  }
}

/**
 * Enhance an existing CV section with AI
 * @param {String} section - Section to enhance (summary, experience, skills)
 * @param {String} currentContent - Current content
 * @param {String} context - Additional context
 * @returns {String} Enhanced content
 */
export async function enhanceSection(section, currentContent, context = '') {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('Servicio de IA no configurado');
    }

    const model = getGeminiModel();

    const prompts = {
      summary: `Mejora este resumen profesional haciéndolo más impactante y conciso (máximo 3 oraciones):

Resumen actual: ${currentContent}
Contexto: ${context}

Responde solo con el resumen mejorado, sin explicaciones adicionales.`,

      experience: `Mejora esta descripción de experiencia laboral haciéndola más específica y orientada a resultados:

Descripción actual: ${currentContent}
Contexto: ${context}

Responde solo con la descripción mejorada, sin explicaciones adicionales.`,

      skills: `Organiza y expande esta lista de habilidades de forma más profesional:

Habilidades actuales: ${currentContent}
Contexto: ${context}

Responde solo con la lista mejorada, sin explicaciones adicionales.`
    };

    const prompt = prompts[section] || prompts.summary;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const enhancedContent = response.text().trim();

    logger.info('Section enhanced successfully', { section });

    return enhancedContent;
  } catch (error) {
    logger.error('Error enhancing CV section', { error: error.message, section });
    throw error;
  }
}

export default {
  generateCV,
  enhanceSection
};
