// Configuración de múltiples proveedores de AI
const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI GPT-3.5/GPT-4',
    baseURL: 'https://api.openai.com/v1',
    free: false,
    setup: 'Requiere API key de OpenAI'
  },
  deepseek: {
    name: 'DeepSeek-V3',
    baseURL: 'https://api.deepseek.com/v1',
    free: false,
    setup: 'API key de DeepSeek - 95% más barato que GPT-4'
  },
  ollama: {
    name: 'Ollama (Local)',
    baseURL: 'http://localhost:11434/v1',
    free: true,
    setup: 'Instalar Ollama localmente - 100% GRATIS'
  },
  groq: {
    name: 'Groq (Llama 3.1)',
    baseURL: 'https://api.groq.com/openai/v1',
    free: true,
    setup: '6,000 tokens/minuto gratis'
  },
  huggingface: {
    name: 'Hugging Face',
    baseURL: 'https://api-inference.huggingface.co/models',
    free: true,
    setup: 'API gratuita de Hugging Face'
  }
};

// Cliente AI universal
class UniversalAIClient {
  constructor(provider = 'demo', apiKey = '', model = '') {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model;
    this.setupClient();
  }

  setupClient() {
    switch (this.provider) {
      case 'openai':
        this.client = this.createOpenAIClient();
        this.defaultModel = 'gpt-3.5-turbo';
        break;
      case 'deepseek':
        this.client = this.createDeepSeekClient();
        this.defaultModel = 'deepseek-chat';
        break;
      case 'ollama':
        this.client = this.createOllamaClient();
        this.defaultModel = 'gemma3:1b';
        break;
      case 'groq':
        this.client = this.createGroqClient();
        this.defaultModel = 'llama-3.1-70b-versatile';
        break;
      case 'huggingface':
        this.client = this.createHuggingFaceClient();
        this.defaultModel = 'microsoft/DialoGPT-medium';
        break;
      default:
        this.client = null;
        this.defaultModel = 'demo';
    }
  }

  createOpenAIClient() {
    if (!this.apiKey) return null;
    return {
      chat: {
        completions: {
          create: async (params) => {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(params)
            });
            return await response.json();
          }
        }
      }
    };
  }

  createDeepSeekClient() {
    if (!this.apiKey) return null;
    return {
      chat: {
        completions: {
          create: async (params) => {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(params)
            });
            return await response.json();
          }
        }
      }
    };
  }

  createOllamaClient() {
    return {
      chat: {
        completions: {
          create: async (params) => {
            try {
              const response = await fetch('http://localhost:11434/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...params,
                  model: this.model || 'gemma3:1b'
                })
              });
              
              if (!response.ok) {
                throw new Error(`Ollama retornó error ${response.status}`);
              }
              
              const data = await response.json();
              
              // Validar estructura de respuesta
              if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
                throw new Error('Respuesta inválida de Ollama');
              }
              
              return data;
            } catch (error) {
              throw new Error(`Ollama no está corriendo o hay un error: ${error.message}`);
            }
          }
        }
      }
    };
  }

  createGroqClient() {
    if (!this.apiKey) return null;
    return {
      chat: {
        completions: {
          create: async (params) => {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...params,
                model: this.model || 'llama-3.1-70b-versatile'
              })
            });
            return await response.json();
          }
        }
      }
    };
  }

  createHuggingFaceClient() {
    if (!this.apiKey) return null;
    return {
      chat: {
        completions: {
          create: async (params) => {
            const response = await fetch(`https://api-inference.huggingface.co/models/${this.model || 'microsoft/DialoGPT-medium'}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                inputs: params.messages[params.messages.length - 1].content
              })
            });
            const result = await response.json();
            return {
              choices: [{
                message: {
                  content: result.generated_text || result[0]?.generated_text || 'Sin respuesta'
                }
              }]
            };
          }
        }
      }
    };
  }

  async generateResponse(messages) {
    if (!this.client || this.provider === 'demo') {
      return this.generateDemoResponse(messages);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model || this.defaultModel,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      });

      // Validar que la respuesta tenga la estructura esperada
      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Respuesta inválida del LLM');
      }

      return {
        content: response.choices[0].message.content || 'Sin respuesta del modelo',
        provider: this.provider,
        model: this.model || this.defaultModel,
        usage: response.usage
      };
    } catch (error) {
      console.error(`Error con ${this.provider}:`, error);
      return this.generateDemoResponse(messages, `Error: ${error.message}`);
    }
  }

  generateDemoResponse(messages, errorMsg = '') {
    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    
    let response = `📊 **ANÁLISIS DEMO DEL DOCUMENTO**

**Consulta:** "${messages[messages.length - 1].content}"

🔍 **Resultados encontrados (modo demo):**

• **Métricas de rendimiento:** 94.5% de precisión
• **Velocidad de procesamiento:** 2.3 segundos por página  
• **Tiempo de respuesta:** 1.8 segundos promedio
• **Precisión en citación:** 98.2%

📈 **Análisis específico:**`;

    if (lastMessage.includes('conclusión') || lastMessage.includes('resumen')) {
      response += `\n\n**Conclusiones principales:**
1. Los sistemas de IA conversacional muestran mejoras significativas
2. La integración del protocolo MCP facilita la compatibilidad
3. Los resultados experimentales superan las expectativas iniciales`;
    } else if (lastMessage.includes('metodología') || lastMessage.includes('método')) {
      response += `\n\n**Metodología identificada:**
1. Arquitectura basada en Model Context Protocol (MCP)
2. Integración con múltiples proveedores de IA
3. Testing con muestra de 500 documentos técnicos`;
    } else {
      response += `\n\n**Información relevante encontrada en el documento relacionada con tu consulta.**`;
    }

    response += `\n\n---
💡 **Respuesta generada en modo demo.** 

🚀 **Para análisis real con IA, elige un proveedor:**
• **DeepSeek** - 95% más barato que GPT-4
• **Ollama** - 100% GRATIS (local)
• **Groq** - Gratis hasta 6K tokens/minuto
• **Hugging Face** - API gratuita`;

    if (errorMsg) {
      response += `\n\n⚠️ **Error:** ${errorMsg}`;
    }

    return {
      content: response,
      provider: 'demo',
      model: 'demo-v1',
      usage: { tokens: 0, cost: 0 }
    };
  }
}

module.exports = { UniversalAIClient, AI_PROVIDERS };