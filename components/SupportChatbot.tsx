'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Upload,
  Settings,
  KeyRound,
  Download,
  Globe,
  Calendar,
  Key,
  ShieldCheck,
  Check,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import {
  SUPPORT_FAQS,
  findBestAnswer,
  askGeminiAssistant,
  SupportAction,
} from '@/lib/supportKnowledge';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  action?: SupportAction;
  timestamp: Date;
}

interface SupportChatbotProps {
  onOpenImport?: () => void;
  onOpenSettings?: () => void;
  onOpenGenerator?: () => void;
}

export default function SupportChatbot({
  onOpenImport,
  onOpenSettings,
  onOpenGenerator,
}: SupportChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');

  // Messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `### Bonjour ! Je suis l'Assistant Keo 🛡️
Je suis là pour vous aider à utiliser au mieux **KeoPass** et **Keo Family**.

Posez-moi vos questions ou choisissez l'un des sujets rapides ci-dessous :`,
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger la clé API Gemini depuis le localStorage si configurée
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('keo_gemini_api_key') || '';
      if (savedKey) {
        setGeminiApiKey(savedKey);
        setTempApiKey(savedKey);
      }
    } catch (_) {}
  }, []);

  // Défilement automatique vers le bas lors de nouveaux messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Focus sur l'input lors de l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim();
    setGeminiApiKey(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem('keo_gemini_api_key', trimmed);
      } else {
        localStorage.removeItem('keo_gemini_api_key');
      }
    } catch (_) {}
    setShowConfig(false);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: `Conversation réinitialisée. Comment puis-je vous aider ?`,
        timestamp: new Date(),
      },
    ]);
  };

  const executeAction = (action: SupportAction) => {
    if (action.type === 'open_import' && onOpenImport) {
      onOpenImport();
      setIsOpen(false);
    } else if (action.type === 'open_settings' && onOpenSettings) {
      onOpenSettings();
      setIsOpen(false);
    } else if (action.type === 'open_generator' && onOpenGenerator) {
      onOpenGenerator();
      setIsOpen(false);
    } else if (action.url) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // 1. Si une clé Gemini est disponible, essayer d'appeler l'IA pour une réponse sur mesure
      if (geminiApiKey) {
        const historyForGemini = messages
          .filter((m) => m.id !== 'welcome')
          .slice(-6)
          .map((m) => ({
            role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
            parts: [{ text: m.text }],
          }));

        try {
          const aiResponse = await askGeminiAssistant(text, historyForGemini, geminiApiKey);
          const matchedFaq = findBestAnswer(text);

          setMessages((prev) => [
            ...prev,
            {
              id: 'reply-' + Date.now(),
              sender: 'assistant',
              text: aiResponse,
              action: matchedFaq?.faq?.action,
              timestamp: new Date(),
            },
          ]);
          setLoading(false);
          return;
        } catch (apiErr) {
          console.warn('Fallback sur base de connaissances locale:', apiErr);
        }
      }

      // 2. Moteur de recherche de connaissances local (100% hors-ligne, instantané et gratuit)
      await new Promise((res) => setTimeout(res, 300)); // délai fluide de lecture
      const match = findBestAnswer(text);

      if (match) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'reply-' + Date.now(),
            sender: 'assistant',
            text: match.faq.answer,
            action: match.faq.action,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: 'reply-' + Date.now(),
            sender: 'assistant',
            text: `Je n'ai pas trouvé de réponse exacte à cette question dans ma base de connaissances.

Voici les sujets d'aide les plus fréquents que vous pouvez explorer :
* **Import de mots de passe** depuis Chrome, Firefox ou Bitwarden
* **Configuration de l'empreinte digitale** sur smartphone Android
* **Mise à jour de l'application Android (APK)**
* **Codes 2FA / TOTP** et double authentification
* **Rendez-vous Doctolib** et fichiers .ics dans Keo Family

Vous pouvez aussi connecter une clé gratuite Google Gemini dans les réglages (⚙️) pour discuter en mode IA conversationnelle libre.`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          sender: 'assistant',
          text: `Désolé, une erreur est survenue lors du traitement de votre demande.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Rendu visuel simple du Markdown (titres, puces, gras, citations)
   */
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-gray-800 dark:text-gray-200 leading-relaxed break-words">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-extrabold text-sm text-gray-900 dark:text-white pt-1">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('* ') || line.startsWith('- ')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-2">
                <span className="text-vault-600 dark:text-vault-400 font-bold">•</span>
                <span>{renderInlineBoldAndLinks(line.substring(2))}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^(\d+)\.\s/)?.[1] || '1';
            const rest = line.replace(/^\d+\.\s/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-2">
                <span className="font-bold text-vault-600 dark:text-vault-400 shrink-0">{num}.</span>
                <span>{renderInlineBoldAndLinks(rest)}</span>
              </div>
            );
          }
          if (line.startsWith('> ')) {
            return (
              <blockquote
                key={idx}
                className="pl-3 py-1 border-l-2 border-vault-500 bg-vault-50/50 dark:bg-vault-950/30 rounded-r text-[11px] text-gray-600 dark:text-gray-300 italic"
              >
                {renderInlineBoldAndLinks(line.replace('> ', ''))}
              </blockquote>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx}>{renderInlineBoldAndLinks(line)}</p>;
        })}
      </div>
    );
  };

  const renderInlineBoldAndLinks = (text: string) => {
    // Remplacer **gras** et [lien](url)
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-gray-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-[11px] font-mono text-vault-700 dark:text-vault-300"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-vault-600 dark:text-vault-400 underline font-semibold hover:text-vault-700"
          >
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* BOUTON FLOTTANT D'OUVERTURE DU CHATBOT */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative p-3.5 bg-gradient-to-r from-vault-600 to-emerald-500 hover:from-vault-700 hover:to-emerald-600 text-white rounded-full shadow-lg shadow-vault-600/30 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
            title="Assistant Keo & Support"
            aria-label="Ouvrir le support Keo"
          >
            <Bot className="w-6 h-6" />
            <span className="hidden md:inline pr-1 font-bold text-xs tracking-wide">
              Support Keo
            </span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full" />
          </button>
        )}
      </div>

      {/* PANNEAU DE CONVERSATION ESCAMOTABLE */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[94vw] sm:w-[410px] h-[580px] max-h-[85vh] bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-750 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* EN-TÊTE DU CHATBOT */}
          <div className="px-4 py-3 bg-gradient-to-r from-vault-600 via-emerald-600 to-teal-600 text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight">Assistant Keo</h3>
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-400/25 text-emerald-100 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    En ligne
                  </span>
                </div>
                <p className="text-[10px] text-emerald-100/80">
                  {geminiApiKey ? 'Mode IA Gemini activé' : 'Base de connaissances & FAQ'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/80">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className={`p-1.5 hover:text-white hover:bg-white/10 rounded-xl transition ${
                  showConfig ? 'bg-white/20 text-white' : ''
                }`}
                title="Paramètres de l'IA (Clé Gemini)"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Effacer l'historique"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TIROIR DE CONFIGURATION DE LA CLÉ GEMINI */}
          {showConfig && (
            <div className="p-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-750 text-xs space-y-2 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Mode IA Conversationnelle (Optionnel)
                </span>
                <span className="text-[10px] text-gray-400">Gratuit via Google AI Studio</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Pour des réponses IA illimitées et fluides, vous pouvez ajouter votre clé API Gemini personnelle (conservée uniquement sur cet appareil) :
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Collez votre clé API Gemini (AIza...)"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-vault-500"
                />
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-3 py-1.5 bg-vault-600 hover:bg-vault-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* ZONE DE DÉFILEMENT DES MESSAGES */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-gray-50/50 dark:bg-slate-900/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-vault-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-750 text-gray-800 dark:text-gray-200 rounded-bl-xs'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="text-xs whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div className="space-y-2">
                      {renderFormattedText(msg.text)}

                      {/* BOUTON D'ACTION DIRECTE DÉTECTÉ */}
                      {msg.action && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => executeAction(msg.action!)}
                            className="py-1.5 px-3 bg-vault-50 hover:bg-vault-100 dark:bg-vault-950/60 dark:hover:bg-vault-900/60 text-vault-700 dark:text-vault-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 border border-vault-200 dark:border-vault-800 shadow-2xs"
                          >
                            {msg.action.type === 'open_import' && <Upload className="w-3.5 h-3.5" />}
                            {msg.action.type === 'open_settings' && <Settings className="w-3.5 h-3.5" />}
                            {msg.action.type === 'open_generator' && <KeyRound className="w-3.5 h-3.5" />}
                            {msg.action.type === 'open_download_apk' && <Download className="w-3.5 h-3.5" />}
                            {msg.action.type === 'open_web' && <Globe className="w-3.5 h-3.5" />}
                            {msg.action.type === 'open_dar' && <Calendar className="w-3.5 h-3.5" />}
                            <span>{msg.action.label}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}

            {/* INDICATEUR DE RÉFLEXION / CHARGEMENT */}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-400 p-2">
                <Bot className="w-4 h-4 text-vault-600 animate-bounce" />
                <span className="animate-pulse">L’assistant recherche la meilleure réponse...</span>
              </div>
            )}

            {/* SUGGESTIONS RAPIDES (AU DÉPART) */}
            {messages.length <= 2 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  Questions fréquentes :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORT_FAQS.map((faq) => (
                    <button
                      key={faq.id}
                      type="button"
                      onClick={() => handleSendMessage(faq.quickQuestion)}
                      className="text-left text-[11px] font-medium py-1.5 px-2.5 bg-white hover:bg-vault-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-300 hover:text-vault-700 dark:hover:text-vault-300 rounded-xl border border-gray-200 dark:border-slate-700 transition shadow-2xs"
                    >
                      {faq.quickQuestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ZONE DE SAISIE */}
          <div className="p-2.5 bg-white dark:bg-slate-850 border-t border-gray-100 dark:border-slate-750 shrink-0 space-y-1.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question (ex: comment importer...)"
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 bg-gray-100 dark:bg-slate-800 border-none rounded-2xl text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-vault-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-vault-600 hover:bg-vault-700 disabled:opacity-40 text-white rounded-2xl transition shadow-xs"
                title="Envoyer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-vault-600" />
                Zero-Knowledge : vos secrets restent sur votre appareil
              </span>
              <span>Keo Support v1.0</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
