import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User,
  MapPin,
  Calendar,
  Users,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Card, Button } from '../../components/common';
import './Assistant.css';

const Assistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hi! I'm UniBot, your AI campus assistant. 👋 I can help you with:\n\n• **Facility locations** - Find offices and rooms\n• **Schedule queries** - Check room availability\n• **Organization info** - Learn about campus orgs\n• **General inquiries** - Campus services and more\n\nHow can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const quickQueries = [
    { icon: MapPin, text: "Where is the DIT office?" },
    { icon: Calendar, text: "Is CompLab 2 available now?" },
    { icon: Users, text: "Who are the BITS officers?" },
    { icon: HelpCircle, text: "How do I book a room?" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getBotResponse = (query) => {
    const lowerQuery = query.toLowerCase();
    
    // Facility Locator
    if (lowerQuery.includes('dit office') || lowerQuery.includes('dit department')) {
      return "The **DIT (Department of Information Technology) Office** is located at:\n\n📍 **New Building, 2nd Floor**\n\nOffice hours: Monday to Friday, 8:00 AM - 5:00 PM\n\nYou can reach them for concerns about your IT courses, clearance, and enrollment.";
    }
    
    if (lowerQuery.includes('registrar')) {
      return "The **Office of the Registrar** is located at:\n\n📍 **Old Building, Ground Floor**\n\nOffice hours: Monday to Friday, 8:00 AM - 5:00 PM\n\nServices: Enrollment, Grades, Transcripts, Certifications";
    }
    
    if (lowerQuery.includes('library')) {
      return "The **Campus Library** is located at:\n\n📍 **Old Building, 1st Floor**\n\nOperating hours: Monday to Friday, 7:00 AM - 7:00 PM, Saturday: 8:00 AM - 5:00 PM\n\nRemember to bring your student ID for access!";
    }
    
    if (lowerQuery.includes('health') || lowerQuery.includes('clinic')) {
      return "The **Health Service Unit** is located at:\n\n📍 **Old Building, Ground Floor**\n\nFor medical concerns and emergencies, you can visit during:\nMonday to Friday, 8:00 AM - 5:00 PM\n\n🚨 For emergencies outside office hours, contact the Guard at the main gate.";
    }
    
    // Schedule Queries
    if (lowerQuery.includes('complab 2') || lowerQuery.includes('computer lab 2')) {
      return "**CompLab 2 Status:**\n\n✅ Currently **VACANT**\n\n📍 Location: Old Building, 2nd Floor\n👥 Capacity: 30 students\n\nNext scheduled class: 1:00 PM - Programming Lab\n\nWould you like to request access to this room?";
    }
    
    if (lowerQuery.includes('available') || lowerQuery.includes('vacant')) {
      return "Here are the currently **vacant rooms**:\n\n**New Building:**\n• Room 101, 201, 301, 401\n\n**Old Building:**\n• CompLab 2, CompLab 3\n\n**Gymnasium:**\n• Basketball Court, Stage\n\n**HM Lab:**\n• Mock Hotel Room\n\nWould you like details on any specific room?";
    }
    
    // Organization Queries
    if (lowerQuery.includes('bits') && (lowerQuery.includes('officer') || lowerQuery.includes('who'))) {
      return "**BITS (Bachelor of Information Technology Society) Officers:**\n\n👤 President: Juan Dela Cruz\n👤 Vice President: Maria Santos\n👤 Secretary: Jose Garcia\n👤 Treasurer: Ana Reyes\n\nThe organization holds meetings every Friday at 3:00 PM.\n\nWould you like to know about their upcoming events?";
    }
    
    if (lowerQuery.includes('organization') || lowerQuery.includes('org')) {
      return "**Campus Organizations at CvSU Imus:**\n\n• CSG - Central Student Government\n• BITS - IT Society\n• BMS - Business Management Society\n• Cavite Communicators\n• CHTS - Hospitality & Tourism Society\n• CYLE - Youth Leadership\n• Educators' Guild\n• Honor Society\n• And more!\n\nWhich organization would you like to know more about?";
    }
    
    // Room Booking
    if (lowerQuery.includes('book') || lowerQuery.includes('booking') || lowerQuery.includes('reserve')) {
      return "**How to Book a Room:**\n\n1. Go to **Facilities** page\n2. Select an available (green) room\n3. Click **Request Room Access**\n4. Fill in the reason and duration\n5. Submit your request\n\n**For Faculty:** You can request Ad-Hoc access to any vacant room for make-up classes.\n\n**For Students:** Class representatives can request room unlocks for scheduled classes.\n\nWould you like me to direct you to the Facilities page?";
    }
    
    // Default response
    return "I'm not sure I understand that query. Here are some things I can help you with:\n\n• Finding campus offices and facilities\n• Checking room availability\n• Organization information\n• Room booking procedures\n• Emergency contacts\n\nCould you please rephrase your question?";
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot response delay
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: 'bot',
        content: getBotResponse(inputValue),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickQuery = (query) => {
    setInputValue(query);
  };

  return (
    <div className="assistant-page">
      <div className="assistant-container">
        <div className="assistant-header">
          <div className="assistant-title">
            <div className="bot-avatar">
              <Bot size={24} />
            </div>
            <div>
              <h1>UniBot Assistant</h1>
              <p>AI-powered campus help</p>
            </div>
          </div>
          <div className="assistant-status">
            <Sparkles size={16} />
            Online
          </div>
        </div>

        <div className="chat-container">
          <div className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-avatar">
                  {message.type === 'bot' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className="message-content">
                  <div className="message-text" dangerouslySetInnerHTML={{ 
                    __html: message.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message bot">
                <div className="message-avatar">
                  <Bot size={18} />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Queries */}
          <div className="quick-queries">
            {quickQueries.map((query, index) => (
              <button 
                key={index}
                className="quick-query-btn"
                onClick={() => handleQuickQuery(query.text)}
              >
                <query.icon size={14} />
                {query.text}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask me anything about the campus..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend}>
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
