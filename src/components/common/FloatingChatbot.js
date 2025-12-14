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
import { findBestFitRoom } from '../../utils/bestFit';
import './FloatingChatbot.css';

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationContext, setConversationContext] = useState({
    lastTopic: null,
    lastRooms: null,
    lastQuery: null,
    pendingFollowUp: null
  });
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello there! 👋 I'm **UniBot**, your smart campus assistant.\n\nI can help you with:\n• 📍 Finding offices and rooms\n• 📅 Real-time room availability & schedules\n• 👥 Organizations & contacts\n• 🚪 Room booking assistance\n\nTry asking: *\"What rooms are vacant now?\"* or *\"Find me a room for 30 students\"*",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Simulated real-time room data (in production, this would come from API)
  const getRoomData = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Simulated room schedules with realistic timeframes
    const rooms = {
      newBuilding: [
        { 
          name: 'NB-101', 
          capacity: 40,
          status: currentHour >= 8 && currentHour < 10 ? 'occupied' : 'vacant',
          currentClass: currentHour >= 8 && currentHour < 10 ? 'IT Elective 3 - BSCS 3-1' : null,
          schedule: [
            { time: '8:00 AM - 9:30 AM', class: 'IT Elective 3 - BSCS 3-1' },
            { time: '10:00 AM - 11:30 AM', class: 'Web Development - BSIT 2-1' },
            { time: '1:00 PM - 2:30 PM', class: 'Database Systems - BSCS 2-1' },
            { time: '3:00 PM - 4:30 PM', class: 'Available for booking' }
          ],
          nextVacant: currentHour >= 8 && currentHour < 10 ? '9:30 AM' : 'Now',
          vacantUntil: currentHour < 8 ? '8:00 AM' : currentHour >= 10 && currentHour < 13 ? '1:00 PM' : '5:00 PM'
        },
        { 
          name: 'NB-201', 
          capacity: 50,
          status: 'vacant',
          currentClass: null,
          schedule: [
            { time: '1:00 PM - 2:30 PM', class: 'Software Engineering - BSCS 3-2' },
            { time: '3:00 PM - 4:30 PM', class: 'Capstone Project - BSCS 4-1' }
          ],
          nextVacant: 'Now',
          vacantUntil: '1:00 PM'
        },
        { 
          name: 'NB-301', 
          capacity: 45,
          status: 'vacant',
          currentClass: null,
          schedule: [
            { time: '10:00 AM - 11:30 AM', class: 'Data Structures - BSCS 2-2' }
          ],
          nextVacant: 'Now',
          vacantUntil: currentHour < 10 ? '10:00 AM' : '5:00 PM'
        },
        { 
          name: 'NB-401', 
          capacity: 40,
          status: currentHour >= 13 && currentHour < 15 ? 'occupied' : 'vacant',
          currentClass: currentHour >= 13 && currentHour < 15 ? 'Mobile Dev - BSIT 3-1' : null,
          schedule: [
            { time: '1:00 PM - 2:30 PM', class: 'Mobile Dev - BSIT 3-1' }
          ],
          nextVacant: currentHour >= 13 && currentHour < 15 ? '2:30 PM' : 'Now',
          vacantUntil: currentHour < 13 ? '1:00 PM' : '5:00 PM'
        }
      ],
      oldBuilding: [
        { 
          name: 'CompLab 1', 
          capacity: 40,
          status: 'occupied',
          currentClass: 'Programming 1 - BSCS 1-1',
          schedule: [
            { time: '8:00 AM - 11:30 AM', class: 'Programming 1 - BSCS 1-1' },
            { time: '1:00 PM - 4:30 PM', class: 'Programming 2 - BSCS 1-2' }
          ],
          nextVacant: currentHour < 12 ? '11:30 AM' : '4:30 PM',
          vacantUntil: null
        },
        { 
          name: 'CompLab 2', 
          capacity: 40,
          status: 'vacant',
          currentClass: null,
          schedule: [
            { time: '3:00 PM - 4:30 PM', class: 'Network Admin - BSIT 3-2' }
          ],
          nextVacant: 'Now',
          vacantUntil: '3:00 PM'
        },
        { 
          name: 'CompLab 3', 
          capacity: 35,
          status: 'vacant',
          currentClass: null,
          schedule: [],
          nextVacant: 'Now',
          vacantUntil: '5:00 PM (No scheduled classes)'
        },
        { 
          name: 'Room 203', 
          capacity: 35,
          status: 'vacant',
          currentClass: null,
          schedule: [
            { time: '1:00 PM - 2:30 PM', class: 'English 2 - BSCS 1-1' }
          ],
          nextVacant: 'Now',
          vacantUntil: currentHour < 13 ? '1:00 PM' : '5:00 PM'
        },
        { 
          name: 'Room 204', 
          capacity: 35,
          status: 'vacant',
          currentClass: null,
          schedule: [],
          nextVacant: 'Now',
          vacantUntil: '5:00 PM (No scheduled classes)'
        },
        { 
          name: 'Room 205', 
          capacity: 30,
          status: 'vacant',
          currentClass: null,
          schedule: [
            { time: '10:00 AM - 11:30 AM', class: 'Math 1 - BSIT 1-1' }
          ],
          nextVacant: 'Now',
          vacantUntil: currentHour < 10 ? '10:00 AM' : '5:00 PM'
        }
      ],
      gymnasium: [
        { 
          name: 'Basketball Court', 
          capacity: 200,
          status: 'vacant',
          currentClass: null,
          schedule: [
            { time: '2:00 PM - 4:00 PM', class: 'PE Class - Mixed Sections' }
          ],
          nextVacant: 'Now',
          vacantUntil: currentHour < 14 ? '2:00 PM' : '6:00 PM'
        },
        { 
          name: 'Volleyball Court', 
          capacity: 100,
          status: currentHour >= 10 && currentHour < 12 ? 'occupied' : 'vacant',
          currentClass: currentHour >= 10 && currentHour < 12 ? 'PE Class - BSHM 2-1' : null,
          schedule: [
            { time: '10:00 AM - 12:00 PM', class: 'PE Class - BSHM 2-1' }
          ],
          nextVacant: currentHour >= 10 && currentHour < 12 ? '12:00 PM' : 'Now',
          vacantUntil: currentHour < 10 ? '10:00 AM' : '6:00 PM'
        }
      ]
    };

    return { rooms, currentTime, dayOfWeek };
  };

  const quickQueries = [
    { icon: MapPin, text: "Where is the Registrar?" },
    { icon: Calendar, text: "Vacant rooms now?" },
    { icon: Users, text: "List all organizations" },
    { icon: HelpCircle, text: "Find room for 30 students" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getBotResponse = (query) => {
    const lowerQuery = query.toLowerCase();
    const { rooms, currentTime, dayOfWeek } = getRoomData();
    
    // Check if this is a follow-up question about previously mentioned rooms
    const isFollowUp = conversationContext.lastTopic === 'rooms' && 
      (lowerQuery.includes('time') || lowerQuery.includes('when') || lowerQuery.includes('schedule') || 
       lowerQuery.includes('how long') || lowerQuery.includes('until') || lowerQuery.includes('those'));
    
    // Greetings
    if (lowerQuery.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
      return "Hello! 😊 Great to see you! I'm UniBot, your smart campus assistant.\n\nI can help you with:\n• 🏢 Finding vacant rooms with schedules\n• 📍 Locating offices and facilities\n• 👥 Organization information\n• 🔍 Smart room recommendations\n\nWhat do you need help with?";
    }

    // Thank you responses
    if (lowerQuery.match(/(thank|thanks|salamat)/)) {
      return "You're welcome! 💚 Happy to help. Feel free to ask anything else about campus facilities, schedules, or organizations!";
    }

    // ============ SMART ROOM QUERIES ============
    
    // Follow-up about room schedules/timeframes
    if (isFollowUp && conversationContext.lastRooms) {
      const roomDetails = [];
      const allRooms = [...rooms.newBuilding, ...rooms.oldBuilding, ...rooms.gymnasium];
      
      conversationContext.lastRooms.forEach(roomName => {
        const room = allRooms.find(r => r.name === roomName);
        if (room) {
          const scheduleText = room.schedule.length > 0 
            ? room.schedule.map(s => `  • ${s.time}: ${s.class}`).join('\n')
            : '  • No classes scheduled today';
          
          roomDetails.push(`**${room.name}** (${room.capacity} seats)\n` +
            `🟢 Vacant until: **${room.vacantUntil}**\n` +
            `📅 Today's schedule:\n${scheduleText}`);
        }
      });

      setConversationContext(prev => ({ ...prev, pendingFollowUp: null }));
      
      return `Here are the detailed schedules for those rooms:\n\n${roomDetails.join('\n\n')}\n\nWould you like me to help you book any of these?`;
    }
    
    // Find room for X students (Best-Fit Algorithm)
    const capacityMatch = lowerQuery.match(/(\d+)\s*(students?|people|persons?|seats?|pax)/);
    if (capacityMatch || lowerQuery.includes('find room') || lowerQuery.includes('need room') || lowerQuery.includes('looking for room')) {
      const requestedCapacity = capacityMatch ? parseInt(capacityMatch[1]) : 30;
      
      // Use Best-Fit algorithm
      const result = findBestFitRoom({
        capacity: requestedCapacity,
        day: dayOfWeek,
        startTime: currentTime
      });
      
      if (result.success) {
        const allRooms = [...rooms.newBuilding, ...rooms.oldBuilding];
        const vacantRooms = allRooms
          .filter(r => r.status === 'vacant' && r.capacity >= requestedCapacity)
          .sort((a, b) => a.capacity - b.capacity)
          .slice(0, 3);
        
        if (vacantRooms.length > 0) {
          const bestRoom = vacantRooms[0];
          const wastedSeats = bestRoom.capacity - requestedCapacity;
          
          let response = `🎯 **Best Match Found!**\n\n` +
            `For **${requestedCapacity} students**, I recommend:\n\n` +
            `✅ **${bestRoom.name}** (${bestRoom.capacity} seats)\n` +
            `📍 Location: ${bestRoom.name.startsWith('NB') ? 'New Building' : bestRoom.name.includes('CompLab') ? 'Old Building, 2nd Floor' : 'Old Building'}\n` +
            `⏰ Available until: **${bestRoom.vacantUntil}**\n` +
            `📊 Efficiency: ${wastedSeats} extra seats (${Math.round((requestedCapacity/bestRoom.capacity)*100)}% utilization)\n`;
          
          if (vacantRooms.length > 1) {
            response += `\n**Other options:**\n`;
            vacantRooms.slice(1).forEach(room => {
              response += `• ${room.name} (${room.capacity} seats) - until ${room.vacantUntil}\n`;
            });
          }
          
          response += `\nWould you like me to help you book **${bestRoom.name}**?`;
          
          setConversationContext({
            lastTopic: 'room_recommendation',
            lastRooms: vacantRooms.map(r => r.name),
            lastQuery: query,
            pendingFollowUp: 'booking'
          });
          
          return response;
        }
      }
      
      return `I couldn't find a room that fits ${requestedCapacity} students right now. All suitable rooms are currently occupied.\n\nWould you like me to:\n• Check rooms that will be free soon?\n• Show smaller available rooms?\n• Help you request a booking for later?`;
    }
    
    // Vacant rooms query with detailed schedules
    if (lowerQuery.includes('vacant') || lowerQuery.includes('available') || lowerQuery.includes('free room') || lowerQuery.includes('empty room')) {
      const vacantNewBldg = rooms.newBuilding.filter(r => r.status === 'vacant');
      const vacantOldBldg = rooms.oldBuilding.filter(r => r.status === 'vacant');
      const vacantGym = rooms.gymnasium.filter(r => r.status === 'vacant');
      
      const allVacantNames = [
        ...vacantNewBldg.map(r => r.name),
        ...vacantOldBldg.map(r => r.name),
        ...vacantGym.map(r => r.name)
      ];
      
      // Store context for follow-up questions
      setConversationContext({
        lastTopic: 'rooms',
        lastRooms: allVacantNames,
        lastQuery: query,
        pendingFollowUp: 'schedule'
      });
      
      let response = `📍 **Currently Vacant Rooms** (${currentTime}, ${dayOfWeek}):\n\n`;
      
      if (vacantNewBldg.length > 0) {
        response += `🏢 **New Building:**\n`;
        vacantNewBldg.forEach(room => {
          response += `  • **${room.name}** (${room.capacity} seats) - free until ${room.vacantUntil}\n`;
        });
        response += '\n';
      }
      
      if (vacantOldBldg.length > 0) {
        response += `🏛️ **Old Building:**\n`;
        vacantOldBldg.forEach(room => {
          response += `  • **${room.name}** (${room.capacity} seats) - free until ${room.vacantUntil}\n`;
        });
        response += '\n';
      }
      
      if (vacantGym.length > 0) {
        response += `🏟️ **Gymnasium:**\n`;
        vacantGym.forEach(room => {
          response += `  • **${room.name}** - free until ${room.vacantUntil}\n`;
        });
      }
      
      response += `\n💡 Ask me *"What's the schedule for those rooms?"* for detailed timeframes, or tell me how many students you need space for!`;
      
      return response;
    }
    
    // Specific room query
    const roomMatch = lowerQuery.match(/(nb-?\d+|complab\s*\d+|room\s*\d+)/i);
    if (roomMatch) {
      const roomQuery = roomMatch[1].toUpperCase().replace(/\s+/g, '').replace('COMPLAB', 'CompLab ');
      const allRooms = [...rooms.newBuilding, ...rooms.oldBuilding, ...rooms.gymnasium];
      const room = allRooms.find(r => r.name.toUpperCase().replace(/\s+/g, '').includes(roomQuery.replace(/\s+/g, '')));
      
      if (room) {
        const statusEmoji = room.status === 'vacant' ? '🟢' : '🔴';
        const scheduleText = room.schedule.length > 0 
          ? room.schedule.map(s => `  • ${s.time}: ${s.class}`).join('\n')
          : '  • No classes scheduled today';
        
        return `**${room.name}** Details:\n\n` +
          `${statusEmoji} Status: **${room.status.toUpperCase()}**\n` +
          `👥 Capacity: ${room.capacity} seats\n` +
          `${room.status === 'occupied' ? `📚 Current: ${room.currentClass}\n⏰ Free at: ${room.nextVacant}` : `⏰ Available until: ${room.vacantUntil}`}\n\n` +
          `📅 **Today's Schedule (${dayOfWeek}):**\n${scheduleText}\n\n` +
          `Would you like to book this room or find alternatives?`;
      }
    }

    // ============ FACILITY LOCATOR ============
    
    if (lowerQuery.includes('dit office') || lowerQuery.includes('dit department') || lowerQuery.includes('it office')) {
      return "**DIT (Department of Information Technology) Office**\n\n📍 Location: **New Building, 2nd Floor, Room NB-202**\n🕐 Hours: Mon-Fri, 8:00 AM - 5:00 PM\n👤 Head: Dr. Juan Dela Cruz\n\nServices:\n• Course advising & enrollment\n• Thesis/Capstone consultation\n• Clearance signing\n• OJT/Internship coordination\n\nNeed directions or want to find another office?";
    }
    
    if (lowerQuery.includes('registrar')) {
      return "**Office of the Registrar**\n\n📍 Location: **Old Building, Ground Floor**\n🕐 Hours: Mon-Fri, 8:00 AM - 5:00 PM\n📞 Contact: (046) XXX-XXXX\n\nServices:\n• Enrollment & registration\n• Transcript of records\n• Certifications & documents\n• Grade inquiries\n\nPro tip: Come early to avoid long queues!";
    }
    
    if (lowerQuery.includes('library')) {
      return "**Campus Library**\n\n📍 Location: **Old Building, 2nd Floor**\n🕐 Hours:\n  • Mon-Fri: 7:00 AM - 7:00 PM\n  • Saturday: 8:00 AM - 5:00 PM\n\n📚 Services: Book borrowing, e-resources, study areas, research assistance\n\n💡 Tip: Bring your student ID for access!";
    }
    
    if (lowerQuery.includes('health') || lowerQuery.includes('clinic') || lowerQuery.includes('nurse')) {
      return "**Health Services Unit / Campus Clinic**\n\n📍 Location: **Old Building, Ground Floor**\n🕐 Hours: Mon-Fri, 8:00 AM - 5:00 PM\n\n🏥 Services:\n• First aid treatment\n• Medical consultations\n• Health certificates\n• Emergency response\n\n🚨 After hours emergency: Contact Campus Security";
    }

    if (lowerQuery.includes('cashier') || lowerQuery.includes('payment') || lowerQuery.includes('tuition')) {
      return "**Cashier's Office**\n\n📍 Location: **Old Building, Ground Floor**\n🕐 Hours: Mon-Fri, 8:00 AM - 5:00 PM\n\n💰 Services:\n• Tuition payment\n• Miscellaneous fees\n• Refund processing\n• Payment verification\n\n💡 Accepts cash, GCash, and bank transfers";
    }
    
    // ============ ORGANIZATION QUERIES ============
    
    if ((lowerQuery.includes('bits') || lowerQuery.includes('it society')) && (lowerQuery.includes('officer') || lowerQuery.includes('who') || lowerQuery.includes('contact'))) {
      return "**BITS (Bulacan IT Society) Officers 2024-2025:**\n\n👤 President: Juan Dela Cruz\n👤 Vice President: Maria Santos\n👤 Secretary: Jose Garcia\n👤 Treasurer: Ana Reyes\n👤 Auditor: Carlo Martinez\n👤 P.R.O.: Lisa Aquino\n\n📅 Meetings: Every Friday, 3:00 PM\n📍 Venue: CompLab 2\n📧 Email: bits.cvsuimus@gmail.com\n\nWant to know about upcoming BITS events?";
    }
    
    if (lowerQuery.includes('organization') || lowerQuery.includes('org') || lowerQuery.includes('club') || lowerQuery.includes('list')) {
      return "**CvSU Imus Campus Organizations:**\n\n🏛️ **Tier 1 (Campus-Wide):**\n• CSG - Central Student Government\n• The Flare - Campus Publication\n• CvSU Imus Chorale\n• NSTP/ROTC Corps\n\n💻 **Academic Organizations:**\n• BITS - IT Society\n• BMS - Business Management\n• CHTS - Hospitality & Tourism\n• Cavite Communicators\n\n🎭 **Special Interest:**\n• Drama Guild\n• Sports Clubs\n• Peer Facilitators\n\nWhich organization would you like to know more about?";
    }
    
    // ============ BOOKING & SCHEDULING ============
    
    if (lowerQuery.includes('book') || lowerQuery.includes('reserve') || lowerQuery.includes('request room')) {
      return "**Room Booking Guide:**\n\n📱 **For Faculty:**\n1. Go to Facilities → Instant Book\n2. Enter your requirements\n3. System finds best room automatically\n4. Guard gets notified to unlock\n\n📱 **For Class Reps:**\n1. Go to Facilities page\n2. Find available room (green = vacant)\n3. Click Request Access\n4. Wait for approval notification\n\n📱 **For Organizations:**\n1. Submit booking request via Facilities\n2. Include event details & expected attendees\n3. Await admin approval\n\nWould you like me to find a room for you right now?";
    }

    if (lowerQuery.includes('schedule') || lowerQuery.includes('class today') || lowerQuery.includes('my class')) {
      return "📅 **To view your class schedule:**\n\n1. Go to the **Schedule** page from the sidebar\n2. Toggle between Daily/Weekly view\n3. Click any class to see room details\n\nYour schedule shows:\n• Class times & rooms\n• Instructor information\n• Room availability status\n\nWant me to help you find where a specific class is held?";
    }

    // Emergency
    if (lowerQuery.includes('emergency') || lowerQuery.includes('urgent') || lowerQuery.includes('security')) {
      return "🚨 **Emergency Contacts:**\n\n📞 Campus Security: **0917-XXX-XXXX**\n📞 Health Services: **0918-XXX-XXXX**\n📞 Local Emergency: **911**\n\n📍 Security Office: Main Gate (24/7)\n📍 Clinic: Old Building, Ground Floor\n\n**Stay calm.** Help is available. What's the situation?";
    }
    
    // ============ DEFAULT / UNKNOWN QUERY ============
    
    return `I'm not sure about that specific question, but I'd love to help! 😊\n\nHere's what I can assist with:\n\n📍 **Locations:** "Where is the registrar?"\n🏢 **Room status:** "What rooms are vacant now?"\n🎯 **Smart search:** "Find room for 25 students"\n📅 **Schedules:** "What's the schedule for CompLab 1?"\n👥 **Organizations:** "Tell me about BITS"\n\nTry one of these or rephrase your question!`;
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
