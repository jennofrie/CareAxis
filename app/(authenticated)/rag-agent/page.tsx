"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient, invokeWithAuth } from "@/lib/supabase/client";
import {
  Lock,
  Send,
  Upload,
  FileText,
  Bot,
  User,
  X,
  Paperclip,
  Loader2,
  BookOpen,
  ArrowRight,
  Search,
} from "lucide-react";

interface Source {
  type: "case_note" | "report";
  name: string;
  relevance: "high" | "medium" | "low";
  excerpt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: Source[];
  suggestedFollowups?: string[];
  documentsSearched?: number;
}

const RELEVANCE_COLORS: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function RAGAgentPage() {
  const { canAccessRAGAgent, isLoading: permLoading } = usePermissions();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [knowledgeFiles, setKnowledgeFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setKnowledgeFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  }

  function removeFile(index: number) {
    setKnowledgeFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function buildConversationHistory(): Array<{ role: string; content: string }> {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  async function handleSend(overrideMessage?: string) {
    const query = overrideMessage ?? input.trim();
    if (!query || isSending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideMessage) setInput("");
    setIsSending(true);

    try {
      const conversationHistory = buildConversationHistory();

      const { data, error } = await invokeWithAuth("rag-agent", {
        body: {
          message: query,
          sessionId,
          conversationHistory,
          action: "chat",
        },
      });

      if (error) throw error;

      if (data?.success === false) {
        throw new Error(data?.error || "Failed to get response.");
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data?.response ?? JSON.stringify(data, null, 2),
        timestamp: new Date(),
        sources: data?.sources,
        suggestedFollowups: data?.suggestedFollowups,
        documentsSearched: data?.documentsSearched,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Failed to get response. Please try again."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFollowupClick(followup: string) {
    handleSend(followup);
  }

  if (permLoading) {
    return (
      <>
        <Header title="RAG Agent" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-slate-400 dark:text-slate-500 text-sm">
            Loading...
          </div>
        </div>
      </>
    );
  }

  if (!canAccessRAGAgent) {
    return (
      <>
        <Header title="RAG Agent" />
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Card className="max-w-lg mx-auto text-center py-12">
            <Lock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <Badge variant="premium" className="mb-3">
              Premium Feature
            </Badge>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              RAG Agent
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              Chat with an AI agent powered by your knowledge base documents. This
              feature is restricted to super admin access only.
            </p>
            <Button variant="gradient" onClick={() => (window.location.href = "/app/settings")}>
              Upgrade to Premium
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="RAG Agent" />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Knowledge Base Files Bar */}
        {knowledgeFiles.length > 0 && (
          <div className="px-6 lg:px-8 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Knowledge base (informational -- documents must be embedded via pgvector):
              </span>
              {knowledgeFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-600 dark:text-slate-400"
                >
                  <FileText className="w-3 h-3" />
                  {file.name}
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                RAG Agent
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                Ask questions about your embedded knowledge base documents. The AI will
                retrieve relevant context from case notes and reports to provide accurate,
                document-grounded responses.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <div key={message.id}>
                  <div
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-2.5 max-w-[80%] ${
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          message.role === "user"
                            ? "bg-indigo-600"
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          message.role === "user"
                            ? "bg-indigo-600 text-white rounded-br-md"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`text-xs mt-1.5 ${
                            message.role === "user"
                              ? "text-indigo-200"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {message.documentsSearched != null && (
                            <span className="ml-2">
                              <Search className="w-3 h-3 inline-block mr-0.5" />
                              {message.documentsSearched} docs searched
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sources */}
                  {message.role === "assistant" &&
                    message.sources &&
                    message.sources.length > 0 && (
                      <div className="ml-10 mt-2 max-w-[75%]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Sources
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {message.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                            >
                              <div className="shrink-0 mt-0.5">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                                    {source.name}
                                  </span>
                                  <span
                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                                      RELEVANCE_COLORS[source.relevance] ?? RELEVANCE_COLORS.low
                                    }`}
                                  >
                                    {source.relevance}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                                    {source.type === "case_note" ? "Case Note" : "Report"}
                                  </span>
                                </div>
                                {source.excerpt && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                    {source.excerpt}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Suggested Follow-ups */}
                  {message.role === "assistant" &&
                    message.suggestedFollowups &&
                    message.suggestedFollowups.length > 0 && (
                      <div className="ml-10 mt-2 max-w-[75%]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {message.suggestedFollowups.map((followup, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleFollowupClick(followup)}
                              disabled={isSending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ArrowRight className="w-3 h-3" />
                              {followup}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-200 dark:bg-slate-700">
                      <Bot className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Searching documents and thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                title="Upload knowledge base document"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.csv,.json"
              />
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your documents..."
                  rows={1}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-12 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200 outline-none resize-none"
                  style={{ minHeight: "44px", maxHeight: "120px" }}
                />
              </div>
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isSending}
                size="icon"
                className="shrink-0 w-10 h-10"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
              RAG Agent searches your embedded documents via pgvector for AI-powered responses.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
