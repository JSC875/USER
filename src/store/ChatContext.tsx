import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  sendChatMessage, 
  getChatHistory, 
  markMessagesAsRead, 
  sendTypingStart, 
  sendTypingStop,
  onChatMessage,
  onChatHistory,
  onTypingIndicator,
  onMessagesRead
} from '../utils/socket';
import { useChatNotifications } from '../utils/chatNotificationHelper';

interface ChatMessage {
  id: string;
  rideId: string;
  senderId: string;
  senderType: 'user' | 'driver';
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface ChatState {
  rideId: string;
  messages: ChatMessage[];
  isTyping: boolean;
  unreadCount: number;
  lastMessage?: ChatMessage;
}

interface ChatContextType {
  chats: Map<string, ChatState>;
  activeChat: string | null;
  setActiveChat: (rideId: string | null) => void;
  sendMessage: (rideId: string, message: string, senderId: string) => void;
  loadChatHistory: (rideId: string, requesterId: string) => void;
  markChatAsRead: (rideId: string, readerId: string) => void;
  getUnreadCount: (rideId: string) => number;
  getTotalUnreadCount: () => number;
  clearChat: (rideId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [chats, setChats] = useState<Map<string, ChatState>>(new Map());
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const { sendChatNotificationToCurrentUser } = useChatNotifications();

  useEffect(() => {
    // Set up global chat event listeners
    onChatMessage((message) => {
      console.log('💬 Global chat message received:', message);
      
             // Send push notification for incoming messages from driver
       if (message.senderType === 'driver') {
         console.log('🔔 Sending chat notification from ChatContext for incoming message from driver');
         sendChatNotificationToCurrentUser({
           rideId: message.rideId,
           senderId: message.senderId,
           senderName: message.senderName || 'Driver', // Use sender name if available
           message: message.message,
           messageType: 'text'
         }).catch(error => {
           console.error('❌ Error sending chat notification from ChatContext:', error);
         });
       }
      
      setChats(prevChats => {
        const newChats = new Map(prevChats);
        const existingChat = newChats.get(message.rideId);
        
        if (existingChat) {
          // Update existing chat
          const updatedMessages = [...existingChat.messages, message];
          const unreadCount = message.senderType === 'driver' && !message.isRead 
            ? existingChat.unreadCount + 1 
            : existingChat.unreadCount;
          
          newChats.set(message.rideId, {
            ...existingChat,
            messages: updatedMessages,
            unreadCount,
            lastMessage: message
          });
        } else {
          // Create new chat
          const unreadCount = message.senderType === 'driver' && !message.isRead ? 1 : 0;
          newChats.set(message.rideId, {
            rideId: message.rideId,
            messages: [message],
            isTyping: false,
            unreadCount,
            lastMessage: message
          });
        }
        
        return newChats;
      });
    });

    onChatHistory((data) => {
      console.log('📚 Global chat history received:', data);
      
      setChats(prevChats => {
        const newChats = new Map(prevChats);
        const unreadCount = data.messages.filter(msg => 
          msg.senderType === 'driver' && !msg.isRead
        ).length;
        
        newChats.set(data.rideId, {
          rideId: data.rideId,
          messages: data.messages,
          isTyping: false,
          unreadCount,
          lastMessage: data.messages[data.messages.length - 1]
        });
        
        return newChats;
      });
    });

    onTypingIndicator((data) => {
      console.log('⌨️ Global typing indicator received:', data);
      
      setChats(prevChats => {
        const newChats = new Map(prevChats);
        const existingChat = newChats.get(data.rideId);
        
        if (existingChat) {
          newChats.set(data.rideId, {
            ...existingChat,
            isTyping: data.isTyping
          });
        }
        
        return newChats;
      });
    });

    onMessagesRead((data) => {
      console.log('👁️ Global messages read received:', data);
      
      setChats(prevChats => {
        const newChats = new Map(prevChats);
        const existingChat = newChats.get(data.rideId);
        
        if (existingChat) {
          // Mark messages as read
          const updatedMessages = existingChat.messages.map(msg => ({
            ...msg,
            isRead: msg.senderType === 'user' ? true : msg.isRead
          }));
          
          const unreadCount = updatedMessages.filter(msg => 
            msg.senderType === 'driver' && !msg.isRead
          ).length;
          
          newChats.set(data.rideId, {
            ...existingChat,
            messages: updatedMessages,
            unreadCount
          });
        }
        
        return newChats;
      });
    });
  }, []);

  const sendMessage = (rideId: string, message: string, senderId: string) => {
    sendChatMessage({
      rideId,
      senderId,
      senderType: 'user',
      message
    });
  };

  const loadChatHistory = (rideId: string, requesterId: string) => {
    getChatHistory({
      rideId,
      requesterId,
      requesterType: 'user'
    });
  };

  const markChatAsRead = (rideId: string, readerId: string) => {
    markMessagesAsRead({
      rideId,
      readerId,
      readerType: 'user'
    });
  };

  const getUnreadCount = (rideId: string) => {
    return chats.get(rideId)?.unreadCount || 0;
  };

  const getTotalUnreadCount = () => {
    let total = 0;
    chats.forEach(chat => {
      total += chat.unreadCount;
    });
    return total;
  };

  const clearChat = (rideId: string) => {
    setChats(prevChats => {
      const newChats = new Map(prevChats);
      newChats.delete(rideId);
      return newChats;
    });
  };

  const value: ChatContextType = {
    chats,
    activeChat,
    setActiveChat,
    sendMessage,
    loadChatHistory,
    markChatAsRead,
    getUnreadCount,
    getTotalUnreadCount,
    clearChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 