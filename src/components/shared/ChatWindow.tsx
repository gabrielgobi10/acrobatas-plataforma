import { useState, useEffect, useRef } from 'react';
import { Send, Loader } from 'lucide-react';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../lib/utils';

interface ChatWindowProps {
  otherUserId: string;
  otherUserName: string;
  jobId?: string;
}

export const ChatWindow = ({ otherUserId, otherUserName, jobId }: ChatWindowProps) => {
  const { user } = useAuth();
  const { messages, sendMessage, loading, markConversationAsRead } = useMessages(otherUserId);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
    markConversationAsRead(otherUserId);
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(otherUserId, newMessage.trim(), jobId);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white bg-gray-100 rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200 border-gray-200 bg-blue-600 text-white rounded-t-lg">
        <h3 className="font-bold text-lg">{otherUserName}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-gray-500 py-12">
            <p>Nenhuma mensagem ainda</p>
            <p className="text-sm mt-2">Envie uma mensagem para começar a conversa</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSender = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isSender
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isSender ? 'text-blue-100' : 'text-gray-500 text-gray-600'
                    }`}
                  >
                    {formatDateTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 border-gray-300">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
