import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User,
  X,
  MessageCircle,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  HelpCircle,
  Minimize2
} from 'lucide-react';
import './FloatingChatbot.css';

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello there! 👋 I'm **UniBot**, your friendly campus assistant.\n\nI completely understand how overwhelming campus life can be. **Don't worry** - I'm here to help make things easier for you!\n\nFeel free to ask me about:\n• 📍 Finding offices and rooms\n• 📅 Room availability\n• 👥 Organizations\n• ❓ Campus services\n\nHow can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const quickQueries = [
    { icon: MapPin, text: "Where is the DIT office?" },
    { icon: Calendar, text: "Vacant rooms now?" },
    { icon: Users, text: "BITS officers" },
    { icon: HelpCircle, text: "How to book room?" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Acknowledgement, Empathy, and Reassurance responses
  const getAERResponse = (queryType) => {
    const aer = {
      acknowledgement: [
        "Great question! ",
        "I understand what you're looking for. ",
        "Absolutely, let me help you with that! ",
        "Good thinking asking about this! ",
        "I see what you need. "
      ],
      empathy: [
        "I know navigating campus can be confusing sometimes. ",
        "Finding your way around can be tricky at first! ",
        "I completely understand how important this is for you. ",
        "I can imagine you want to get this sorted quickly. ",
        "Campus life can get hectic, I get it! "
      ],
      reassurance: [
        "Don't worry, I've got you covered! ",
        "Rest assured, this is easy to sort out. ",
        "No problem at all - here's what you need: ",
        "You're in good hands! Here's the information: ",
        "I'm happy to help make this easier for you! "
      ]
    };

    const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
    return randomItem(aer.acknowledgement) + randomItem(aer.empathy) + randomItem(aer.reassurance);
  };

  const getBotResponse = (query) => {
    const lowerQuery = query.toLowerCase();
    let prefix = getAERResponse();
    
    // Greetings
    if (lowerQuery.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
      return "Hello! 😊 It's wonderful to hear from you! I understand you might have questions about campus. **I'm here for you** whenever you need assistance. What can I help you with today?";
    }

    // Thank you responses
    if (lowerQuery.match(/(thank|thanks|salamat)/)) {
      return "You're very welcome! 💚 It's my pleasure to help. I know campus life can be challenging, and **I'm always here** if you need anything else. Don't hesitate to ask anytime!";
    }
    
    // Facility Locator
    if (lowerQuery.includes('dit office') || lowerQuery.includes('dit department')) {
      return prefix + "\n\nThe **DIT (Department of Information Technology) Office** is located at:\n\n📍 **New Building, 2nd Floor**\n🕐 Office hours: Mon-Fri, 8:00 AM - 5:00 PM\n\nThey can help with IT course concerns, clearance, and enrollment. Is there anything else you'd like to know?";
    }
    
    if (lowerQuery.includes('registrar')) {
      return prefix + "\n\nThe **Office of the Registrar** is at:\n\n📍 **Old Building, Ground Floor**\n🕐 Mon-Fri, 8:00 AM - 5:00 PM\n\nServices: Enrollment, Grades, Transcripts, Certifications\n\nNeed directions or more info?";
    }
    
    if (lowerQuery.includes('library')) {
      return prefix + "\n\nThe **Campus Library** awaits you at:\n\n📍 **Old Building, 1st Floor**\n🕐 Mon-Fri: 7AM-7PM, Sat: 8AM-5PM\n\n📝 Pro tip: Bring your student ID for access!\n\nWould you like to know about library services?";
    }
    
    if (lowerQuery.includes('health') || lowerQuery.includes('clinic')) {
      return prefix + "\n\n**Health Service Unit:**\n\n📍 **Old Building, Ground Floor**\n🕐 Mon-Fri, 8:00 AM - 5:00 PM\n\n🚨 **Emergency?** Contact the Guard at the main gate after hours.\n\nYour health matters to us! Anything else I can help with?";
    }

    if (lowerQuery.includes('cashier') || lowerQuery.includes('payment') || lowerQuery.includes('fee')) {
      return prefix + "\n\n**Cashier's Office:**\n\n📍 **Old Building, Ground Floor**\n🕐 Mon-Fri, 8:00 AM - 5:00 PM\n\nThey handle tuition payments, refunds, and financial transactions. Need more details?";
    }
    
    // Schedule Queries
    if (lowerQuery.includes('complab') || lowerQuery.includes('computer lab')) {
      return prefix + "\n\n**Computer Labs Status:**\n\n✅ CompLab 1: Occupied (next free: 3PM)\n✅ CompLab 2: **VACANT**\n✅ CompLab 3: **VACANT**\n\n📍 All located in Old Building, 2nd Floor\n\nWould you like to check room availability for a specific time?";
    }
    
    if (lowerQuery.includes('available') || lowerQuery.includes('vacant') || lowerQuery.includes('room')) {
      return prefix + "\n\n**Currently Vacant Rooms:**\n\n🏢 **New Building:** 101, 201, 301, 401\n🏛️ **Old Building:** CompLab 2, 3, Rooms 203-205\n🏟️ **Gymnasium:** Basketball Court\n\nNeed help booking any of these?";
    }
    
    // Organization Queries
    if (lowerQuery.includes('bits') && (lowerQuery.includes('officer') || lowerQuery.includes('who'))) {
      return prefix + "\n\n**BITS Officers 2024-2025:**\n\n👤 President: Juan Dela Cruz\n👤 VP: Maria Santos\n👤 Secretary: Jose Garcia\n👤 Treasurer: Ana Reyes\n\n📅 Meetings: Fridays at 3 PM\n\nWant to know about their upcoming events?";
    }
    
    if (lowerQuery.includes('organization') || lowerQuery.includes('org') || lowerQuery.includes('club')) {
      return prefix + "\n\n**Campus Organizations:**\n\n🏛️ CSG - Student Government\n💻 BITS - IT Society\n📊 BMS - Business Management\n🎤 Cavite Communicators\n🏨 CHTS - Hospitality & Tourism\n📚 And many more!\n\nWhich org interests you?";
    }
    
    // Room Booking
    if (lowerQuery.includes('book') || lowerQuery.includes('booking') || lowerQuery.includes('reserve') || lowerQuery.includes('request')) {
      return prefix + "\n\n**Room Booking Guide:**\n\n1️⃣ Go to **Facilities** page\n2️⃣ Find a green (available) room\n3️⃣ Click **Request Access**\n4️⃣ Fill in details & submit\n\n**Faculty:** Can request Ad-Hoc access\n**Class Reps:** Can request room unlocks\n\nNeed me to guide you there?";
    }

    // Schedule
    if (lowerQuery.includes('schedule') || lowerQuery.includes('class')) {
      return prefix + "\n\nYou can view your complete class schedule in the **Schedule** page! 📅\n\nIt shows:\n• Daily/Weekly view of classes\n• Room assignments\n• Instructor info\n\nWould you like me to help you find a specific room?";
    }

    // Emergency
    if (lowerQuery.includes('emergency') || lowerQuery.includes('help') || lowerQuery.includes('urgent')) {
      return "I hear that this is urgent. **Your safety is our priority.** 🚨\n\n**Emergency Contacts:**\n📞 Campus Security: 0917-XXX-XXXX\n📞 Health Services: 0918-XXX-XXXX\n📞 Local Emergency: 911\n\n📍 Security Office: Main Gate\n\nIs everything okay? How can I help further?";
    }
    
    // Default response with empathy
    return "I appreciate you reaching out! 😊 While I'm not 100% sure about that specific question, I **want to help you** find the right information.\n\nHere's what I can assist with:\n• 📍 Campus locations\n• 📅 Room availability\n• 👥 Organization info\n• 🚪 Room booking help\n\nCould you rephrase or ask about any of these? I'm here for you!";
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

    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: 'bot',
        content: getBotResponse(inputValue),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1200);
  };

  const handleQuickQuery = (query) => {
    setInputValue(query);
    setTimeout(() => handleSend(), 100);
  };

  if (!isOpen) {
    return (
      <button 
        className="chatbot-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Open chat assistant"
      >
        <MessageCircle size={28} />
        <span className="fab-pulse"></span>
      </button>
    );
  }

  return (
    <div className={`floating-chatbot ${isMinimized ? 'minimized' : ''}`}>
      <div className="chatbot-header" onClick={() => isMinimized && setIsMinimized(false)}>
        <div className="chatbot-title">
          <div className="chatbot-avatar">
            <Bot size={20} />
          </div>
          <div className="chatbot-info">
            <h3>UniBot</h3>
            <span className="chatbot-status">
              <Sparkles size={12} />
              Online
            </span>
          </div>
        </div>
        <div className="chatbot-actions">
          <button onClick={() => setIsMinimized(!isMinimized)} className="chatbot-action-btn">
            <Minimize2 size={18} />
          </button>
          <button onClick={() => setIsOpen(false)} className="chatbot-action-btn">
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.type}`}>
                <div className="chat-message-avatar">
                  {message.type === 'bot' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="chat-message-content">
                  <div 
                    className="chat-message-text"
                    dangerouslySetInnerHTML={{ 
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>')
                    }} 
                  />
                  <span className="chat-message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="chat-message bot">
                <div className="chat-message-avatar">
                  <Bot size={16} />
                </div>
                <div className="chat-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-quick-queries">
            {quickQueries.map((query, index) => (
              <button 
                key={index}
                className="chatbot-quick-btn"
                onClick={() => handleQuickQuery(query.text)}
              >
                <query.icon size={12} />
                {query.text}
              </button>
            ))}
          </div>

          <div className="chatbot-input-area">
            <input
              type="text"
              placeholder="Type your question..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="chatbot-send-btn" onClick={handleSend}>
              <Send size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FloatingChatbot;
