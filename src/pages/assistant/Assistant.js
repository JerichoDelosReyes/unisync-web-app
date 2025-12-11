import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User,
  MapPin,
  Calendar,
  Users,
  HelpCircle,
  Sparkles,
  Building2,
  Clock,
  AlertTriangle,
  Phone,
  BookOpen,
  Coffee
} from 'lucide-react';
import { Card, Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import './Assistant.css';

const Assistant = () => {
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: `Hi${user ? ' ' + user.name.split(' ')[0] : ''}! I'm UniBot, your AI campus assistant. 👋 I can help you with:\n\n• **Facility Locator** - Find any room, office, or building\n• **Schedule Assistant** - Check room availability and class schedules\n• **Organization Info** - Learn about campus orgs and officers\n• **Campus Services** - Library, health services, registrar, etc.\n• **Emergency Info** - Contacts and safety protocols\n\nHow can I assist you today?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Extended quick queries based on user role
  const getQuickQueries = () => {
    const baseQueries = [
      { icon: MapPin, text: "Where is the DIT office?" },
      { icon: Building2, text: "Show me vacant rooms" },
      { icon: Users, text: "List campus organizations" },
      { icon: HelpCircle, text: "How do I book a room?" },
    ];
    
    if (user?.role === 'faculty') {
      return [
        { icon: Calendar, text: "My schedule today" },
        { icon: Building2, text: "Request ad-hoc room" },
        ...baseQueries.slice(0, 2)
      ];
    }
    
    if (user?.role === 'guard') {
      return [
        { icon: AlertTriangle, text: "Emergency protocols" },
        { icon: Phone, text: "Emergency contacts" },
        { icon: Building2, text: "All room statuses" },
        { icon: Clock, text: "Current dispatch requests" },
      ];
    }
    
    return baseQueries;
  };

  const quickQueries = getQuickQueries();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Enhanced NLP-like response system
  const getBotResponse = (query) => {
    const lowerQuery = query.toLowerCase();
    
    // ===== FACILITY LOCATOR =====
    
    // Academic Building
    if (lowerQuery.includes('dit office') || lowerQuery.includes('dit department') || lowerQuery.includes('information technology office')) {
      return "The **DIT (Department of Information Technology) Office** is located at:\n\n📍 **Academic Building, 2nd Floor**\n🕐 Office hours: Monday to Friday, 8:00 AM - 5:00 PM\n\n**Services:**\n• Course enrollment concerns\n• Academic advising\n• Clearance processing\n• OJT coordination\n\nWould you like directions to other IT facilities?";
    }
    
    if (lowerQuery.includes('registrar')) {
      return "The **Office of the Registrar** is located at:\n\n📍 **Academic Building, Ground Floor**\n🕐 Office hours: Monday to Friday, 8:00 AM - 5:00 PM\n\n**Services:**\n• Enrollment & re-enrollment\n• Transcript of Records\n• Certificate of grades\n• Transfer credentials\n• Diploma claims\n\n💡 **Tip:** Bring your student ID for faster service!";
    }
    
    if (lowerQuery.includes('cashier')) {
      return "The **Cashier's Office** is located at:\n\n📍 **Academic Building, Ground Floor** (beside Registrar)\n🕐 Office hours: Monday to Friday, 8:00 AM - 5:00 PM\n\n**Services:**\n• Tuition fee payment\n• Miscellaneous fee payment\n• Refund processing\n\n💡 **Payment Methods:** Cash, GCash, PayMaya, Bank Transfer";
    }
    
    if (lowerQuery.includes('guidance') || lowerQuery.includes('counseling')) {
      return "The **Guidance & Counseling Office** is located at:\n\n📍 **Academic Building, 2nd Floor**\n🕐 Office hours: Monday to Friday, 8:00 AM - 5:00 PM\n\n**Services:**\n• Personal counseling\n• Career guidance\n• Psychological testing\n• Conflict mediation\n\n🔒 All consultations are **strictly confidential**.";
    }
    
    if (lowerQuery.includes('avr') || lowerQuery.includes('audio visual')) {
      return "The **Audio Visual Room (AVR)** is located at:\n\n📍 **Academic Building, 4th Floor**\n👥 Capacity: 100 people\n\n**Amenities:**\n• Projector & screen\n• Sound system\n• Air-conditioning\n• Stage area\n\n**Booking:** Contact Student Affairs or MIS Office for reservations.";
    }
    
    // IT Building
    if (lowerQuery.includes('complab') || lowerQuery.includes('computer lab') || lowerQuery.includes('it lab')) {
      return "**Computer Laboratories** at CvSU Imus:\n\n📍 **IT & Computer Lab Building**\n\n**Ground Floor:**\n• Computer Lab 1 (50 PCs)\n• Computer Lab 2 (50 PCs)\n• MIS Office\n\n**2nd Floor:**\n• Computer Lab 3 (45 PCs)\n• Computer Lab 4 (45 PCs)\n• Cisco Lab\n• Programming Lab\n\n**3rd Floor:**\n• Software Dev Lab\n• Multimedia Lab\n• Server Room (Restricted)\n\n🕐 Operating hours: 7:00 AM - 8:00 PM (Mon-Sat)";
    }
    
    if (lowerQuery.includes('mis office') || lowerQuery.includes('management information')) {
      return "The **MIS (Management Information System) Office** is located at:\n\n📍 **IT Building, Ground Floor**\n🕐 Office hours: Monday to Friday, 8:00 AM - 5:00 PM\n\n**Services:**\n• Student portal concerns\n• Email account issues\n• WiFi connectivity\n• System access requests\n• Technical support\n\n📧 Email: mis.imus@cvsu.edu.ph";
    }
    
    // Library Building
    if (lowerQuery.includes('library')) {
      return "The **Campus Library** is located at:\n\n📍 **Library & Student Services Building, 2nd Floor**\n🕐 Operating hours:\n• Mon-Fri: 7:00 AM - 7:00 PM\n• Saturday: 8:00 AM - 5:00 PM\n\n**Sections:**\n• Main Library (150 capacity)\n• Reading Room (quiet zone)\n• E-Library section\n• Periodicals section\n• Discussion Rooms (2)\n\n💡 **Tip:** Bring your student ID for entry!";
    }
    
    if (lowerQuery.includes('health') || lowerQuery.includes('clinic') || lowerQuery.includes('medical')) {
      return "The **Health Services Unit** is located at:\n\n📍 **Library & Student Services Building, Ground Floor**\n🕐 Operating hours: Monday to Friday, 8:00 AM - 5:00 PM\n\n**Services:**\n• First aid treatment\n• Medical consultations\n• Health certificates\n• Emergency response\n• Medical referrals\n\n🚨 **Emergency?** Call the guard station immediately!";
    }
    
    if (lowerQuery.includes('student affairs') || lowerQuery.includes('osa')) {
      return "The **Student Affairs Office** is located at:\n\n📍 **Library & Student Services Building, Ground Floor**\n🕐 Office hours: Monday to Friday, 8:00 AM - 5:00 PM\n\n**Services:**\n• Student org accreditation\n• Event permits\n• Student ID concerns\n• Good moral certificates\n• Disciplinary matters\n\nThis is also where you get your **org and event approvals**!";
    }
    
    // Other Facilities
    if (lowerQuery.includes('gym') || lowerQuery.includes('gymnasium') || lowerQuery.includes('basketball') || lowerQuery.includes('sports')) {
      return "The **Gymnasium & Sports Complex**:\n\n📍 **Located near the Canteen**\n🕐 Operating hours: 6:00 AM - 8:00 PM (Mon-Sat)\n\n**Facilities:**\n• Main Court (Basketball, Volleyball, Badminton)\n• Stage & Events Area\n• Bleachers (500 capacity)\n• Locker Rooms (Male & Female)\n• PE Faculty Office\n\n**Booking:** Contact PE Faculty or Student Affairs for court reservations.";
    }
    
    if (lowerQuery.includes('canteen') || lowerQuery.includes('cafeteria') || lowerQuery.includes('food') || lowerQuery.includes('eat')) {
      return "The **Canteen & Student Center**:\n\n📍 **Center of Campus**\n🕐 Operating hours: 6:00 AM - 7:00 PM (Mon-Sat)\n\n**Facilities:**\n• Main Dining Hall (200 capacity)\n• 10 Food Stalls\n• Student Lounge (WiFi + Charging)\n• Mini Store (supplies)\n• Organization Hub\n\n🍜 **Popular food options:** Rice meals, snacks, drinks, and student-budget friendly meals!";
    }
    
    if (lowerQuery.includes('hm') || lowerQuery.includes('hospitality') || lowerQuery.includes('kitchen')) {
      return "The **Hospitality Management Building**:\n\n📍 **Near the Gymnasium**\n🕐 Operating hours: 7:00 AM - 6:00 PM (Mon-Sat)\n\n**Facilities:**\n• Main Kitchen Lab\n• Baking Lab\n• Pantry Lab\n• Mock Hotel Room\n• Front Desk Training\n• Fine Dining Lab\n\n🍽️ For HM students' practical training and simulations.";
    }
    
    if (lowerQuery.includes('civil security') || lowerQuery.includes('guard') || lowerQuery.includes('security office')) {
      return "The **Civil Security Office** is located at:\n\n📍 **Library & Student Services Building, Ground Floor**\n🕐 Available 24/7\n\n**Services:**\n• Campus security & patrol\n• Lost & found\n• Visitor management\n• Emergency response\n• Room unlock requests\n\n📞 **Emergency Hotline:** 0917-XXX-XXXX (placeholder)";
    }
    
    // ===== SCHEDULE ASSISTANT =====
    
    if (lowerQuery.includes('vacant') || lowerQuery.includes('available room') || lowerQuery.includes('empty room') || lowerQuery.includes('show me vacant')) {
      return "**Currently Vacant Rooms:**\n\n**Academic Building:**\n✅ Room 101, 201, 301 - Available\n✅ AVR - Available (until 2:00 PM)\n\n**IT Building:**\n✅ Computer Lab 2 - Available\n✅ Programming Lab - Available\n🔴 Computer Lab 1 - In use\n\n**Other Facilities:**\n✅ Gymnasium - Available\n✅ Discussion Room 1 - Available\n\n💡 Go to **Facilities** page for real-time availability and instant booking!";
    }
    
    if (lowerQuery.includes('my schedule') || lowerQuery.includes('schedule today')) {
      if (user?.role === 'faculty') {
        return "**Your Schedule Today:**\n\n🕐 **8:00 AM - 10:00 AM**\nCC 102 - Computer Programming 1\nRoom 201, Academic Building\n\n🕐 **1:00 PM - 3:00 PM**\nIT 301 - System Analysis & Design\nComputer Lab 3, IT Building\n\n🕐 **3:00 PM - 5:00 PM**\nCC 103 - Data Structures\nRoom 301, Academic Building\n\n📌 You have **2 pending room requests** for approval.";
      }
      return "**Your Schedule Today:**\n\n🕐 **7:00 AM - 9:00 AM**\nGE 101 - Purposive Communication\nRoom 101, Academic Building\n\n🕐 **10:00 AM - 12:00 PM**\nCC 102 - Computer Programming 1\nComputer Lab 2, IT Building\n\n🕐 **1:00 PM - 3:00 PM**\nIT 201 - Database Management\nRoom 201, Academic Building\n\n📌 **Reminder:** Quiz in CC 102 today!";
    }
    
    if (lowerQuery.includes('class schedule') || lowerQuery.includes('when is')) {
      return "To check **class schedules**:\n\n1️⃣ Go to the **Schedule** page in the sidebar\n2️⃣ View your weekly schedule grid\n3️⃣ Click on any class for details\n\n**Or** tell me the specific class/subject you're looking for and I'll help you find it!\n\nExample: \"When is CC102?\" or \"Where is my Database class?\"";
    }
    
    // ===== ORGANIZATION INFO =====
    
    if (lowerQuery.includes('bits') && (lowerQuery.includes('officer') || lowerQuery.includes('who') || lowerQuery.includes('president'))) {
      return "**BITS (Bachelor of IT Society) Officers:**\n\n👤 **President:** Juan Dela Cruz\n👤 **Vice President:** Maria Santos\n👤 **Secretary:** Jose Garcia\n👤 **Treasurer:** Ana Reyes\n👤 **Auditor:** Paolo Martinez\n👤 **P.R.O.:** Lisa Tan\n\n📍 **Office:** Organization Hub (Canteen Building)\n📅 **Meetings:** Every Friday, 3:00 PM\n\n🌐 This is a **Tier 2 Organization** (IT Department members)";
    }
    
    if (lowerQuery.includes('csg') || lowerQuery.includes('central student government')) {
      return "**CSG (Central Student Government):**\n\n🏛️ **Tier 1 - Campus-Wide Organization**\n\n**Officers:**\n👤 **President:** Carlos Mendoza\n👤 **Vice President:** Angela Reyes\n👤 **Secretary:** John Santos\n\n📍 **Office:** Organization Hub (Canteen Building)\n📅 **General Assembly:** 1st Monday of the month\n\n📢 CSG can post **campus-wide announcements** visible to all students.";
    }
    
    if (lowerQuery.includes('organization') || lowerQuery.includes('org') || lowerQuery.includes('list') && lowerQuery.includes('org')) {
      return "**Campus Organizations at CvSU Imus:**\n\n**🏛️ Tier 1 (Campus-Wide Posting):**\n• CSG - Central Student Government\n• The Flare - Campus Publication\n• Honor Society\n• Sinag-Tala - Performing Arts\n\n**🏢 Tier 2 (Department/Members Only):**\n• BITS - IT Society\n• BMS - Business Management Society\n• Cavite Communicators - DevCom\n• CHTS - Hospitality & Tourism Society\n• CYLE - Youth Leadership\n• CSC - Computer Studies Club\n• Educators' Guild - Education\n• SMMS - Sports & Exercise Science\n• YOPA - Public Administration\n\nWhich organization would you like to know more about?";
    }
    
    // ===== ROOM BOOKING =====
    
    if (lowerQuery.includes('book') || lowerQuery.includes('booking') || lowerQuery.includes('reserve') || lowerQuery.includes('request room')) {
      if (user?.role === 'faculty') {
        return "**Room Booking for Faculty:**\n\n**Regular Booking:**\n1️⃣ Go to **Facilities** page\n2️⃣ Click on an available room (green)\n3️⃣ Click **Request Room Access**\n4️⃣ Select date and time\n5️⃣ Submit request\n\n**Ad-Hoc Access (Vacant Rooms):**\n• Use **Instant Booking** for immediate access\n• Perfect for make-up classes\n• Automatically uses Best-Fit algorithm for optimal room selection\n\n⚡ Faculty requests are **prioritized** in the approval queue!";
      }
      
      if (user?.isClassRep) {
        return "**Room Booking for Class Representatives:**\n\n1️⃣ Go to **Facilities** page\n2️⃣ Find your scheduled room\n3️⃣ Click **Mark as Vacant** if professor is absent\n4️⃣ Or request unlock for scheduled classes\n\n**For Special Events:**\n• Contact your org adviser\n• Submit event proposal to Student Affairs\n• Room will be allocated based on availability\n\n💡 As Class Rep, you have special permissions for section scheduling!";
      }
      
      return "**How to Book a Room:**\n\n1️⃣ Go to **Facilities** page\n2️⃣ Browse available rooms (green = available)\n3️⃣ Click **Request Room Access**\n4️⃣ Fill in purpose and duration\n5️⃣ Submit and wait for approval\n\n**Booking Priority:**\n1. Official university functions\n2. Department activities\n3. Org events (accredited)\n4. Student activities\n\n💡 Need immediate access? Ask your Class Rep or Faculty to request!";
    }
    
    if (lowerQuery.includes('ad-hoc') || lowerQuery.includes('adhoc') || lowerQuery.includes('instant')) {
      return "**Instant/Ad-Hoc Room Booking:**\n\n⚡ Available for **Faculty** only!\n\n**How it works:**\n1️⃣ Go to **Facilities** page\n2️⃣ Click **Instant Booking**\n3️⃣ Enter number of students\n4️⃣ System uses **Best-Fit Algorithm** to find the optimal room\n5️⃣ Confirm booking\n6️⃣ Guard will unlock room immediately\n\n**Best-Fit Algorithm** finds the smallest room that fits your class size for efficient space utilization!";
    }
    
    // ===== EMERGENCY INFO =====
    
    if (lowerQuery.includes('emergency') && (lowerQuery.includes('contact') || lowerQuery.includes('number') || lowerQuery.includes('hotline'))) {
      return "**🚨 Emergency Contacts:**\n\n**Campus Security:**\n📞 0917-XXX-XXXX (24/7)\n\n**Health Services:**\n📞 046-XXX-XXXX\n\n**Fire Emergency:**\n📞 046-XXX-XXXX\n📞 911 (National)\n\n**Police:**\n📞 046-XXX-XXXX\n📞 911 (National)\n\n**Nearest Hospital:**\n🏥 Imus District Hospital\n📞 046-XXX-XXXX\n\n⚠️ In case of emergency, stay calm and contact Civil Security immediately!";
    }
    
    if (lowerQuery.includes('emergency') && (lowerQuery.includes('protocol') || lowerQuery.includes('procedure') || lowerQuery.includes('what to do'))) {
      return "**🚨 Emergency Protocols:**\n\n**Fire:**\n1. Stay calm, do not panic\n2. Alert others, activate nearest alarm\n3. Exit via nearest fire exit\n4. Proceed to evacuation area\n5. Do not use elevators\n\n**Earthquake:**\n1. DROP, COVER, HOLD ON\n2. Stay away from windows\n3. After shaking: evacuate\n4. Go to open area\n\n**Medical Emergency:**\n1. Call Civil Security\n2. Do not move victim (unless danger)\n3. Perform first aid if trained\n4. Wait for responders\n\n📍 **Evacuation Area:** Open field near gymnasium";
    }
    
    // ===== DISPATCH (for Guards) =====
    
    if (user?.role === 'guard' && (lowerQuery.includes('dispatch') || lowerQuery.includes('pending request') || lowerQuery.includes('unlock request'))) {
      return "**📋 Current Dispatch Queue:**\n\n**High Priority:**\n🔴 Room 301 - Academic Building\nRequester: Prof. Santos\nReason: Make-up class\nStatus: **PENDING** (5 mins ago)\n\n**Normal Priority:**\n🟡 CompLab 2 - IT Building\nRequester: BITS Org\nReason: Organization meeting\nStatus: **PENDING** (15 mins ago)\n\n🟢 Gymnasium\nRequester: PE Dept\nReason: Intramurals practice\nStatus: **APPROVED** - Ready for unlock\n\n💡 Go to **Guard Dashboard** for full dispatch management!";
    }
    
    if (user?.role === 'guard' && (lowerQuery.includes('all room') || lowerQuery.includes('room status'))) {
      return "**🏢 All Room Statuses:**\n\n**Academic Building:**\n🟢 Room 101 - Vacant\n🔴 Room 102 - Occupied (until 10AM)\n🟢 Room 201 - Vacant\n🔴 Room 301 - Occupied (until 12PM)\n🟢 AVR - Vacant\n\n**IT Building:**\n🔴 CompLab 1 - Occupied\n🟢 CompLab 2 - Vacant\n🔴 CompLab 3 - Occupied\n🟢 Cisco Lab - Vacant\n\n**Other:**\n🟢 Gymnasium - Vacant\n🟢 Discussion Rooms - Vacant\n\n🔄 Real-time updates in **Guard Dashboard**";
    }
    
    // ===== GENERAL HELP =====
    
    if (lowerQuery.includes('wifi') || lowerQuery.includes('internet') || lowerQuery.includes('connect')) {
      return "**📶 Campus WiFi Information:**\n\n**Network Name:** CvSU-Student / CvSU-Faculty\n\n**How to Connect:**\n1️⃣ Connect to network\n2️⃣ Open browser → redirect to portal\n3️⃣ Login with student/employee number\n4️⃣ Default password: first-time users use birthdate (MMDDYYYY)\n\n**Issues?** Contact MIS Office at IT Building, Ground Floor.\n\n💡 **Tip:** Coverage is best in Library, IT Building, and Canteen areas!";
    }
    
    if (lowerQuery.includes('id') || lowerQuery.includes('identification') || lowerQuery.includes('student id')) {
      return "**🪪 Student ID Information:**\n\n**Getting Your ID:**\n1️⃣ Submit 1x1 and 2x2 photos\n2️⃣ Pay ID fee at Cashier\n3️⃣ Present receipt at Student Affairs\n4️⃣ Wait for processing (3-5 days)\n5️⃣ Claim at Student Affairs\n\n**Lost ID:**\n• Report to Student Affairs immediately\n• Pay replacement fee at Cashier\n• Process takes 5-7 days\n\n📍 **Location:** Library & Student Services Building, Ground Floor";
    }
    
    if (lowerQuery.includes('enrollment') || lowerQuery.includes('enroll')) {
      return "**📚 Enrollment Process:**\n\n1️⃣ **Pre-registration** - Online via student portal\n2️⃣ **Assessment** - Check at Registrar\n3️⃣ **Payment** - Cashier's Office\n4️⃣ **Validation** - Return to Registrar\n\n**Required Documents:**\n• Registration form\n• Payment receipt\n• Previous grades (for old students)\n• Transfer credentials (for transferees)\n\n📅 Check announcements for enrollment schedule!\n📍 **Registrar:** Academic Building, Ground Floor";
    }
    
    if (lowerQuery.includes('scholarship') || lowerQuery.includes('financial aid')) {
      return "**🎓 Scholarships Available:**\n\n**Government:**\n• TES (Tertiary Education Subsidy)\n• CHED Scholarship\n• DOST-SEI Scholarship\n\n**University:**\n• Academic Excellence Award\n• Student Assistant Program\n• Athletic Scholarship\n\n**How to Apply:**\n1️⃣ Visit Scholarship Office\n2️⃣ Submit requirements\n3️⃣ Wait for evaluation\n4️⃣ Maintain required grades\n\n📍 **Location:** Library & Student Services Building, Ground Floor";
    }
    
    if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
      return `Hello${user ? ' ' + user.name.split(' ')[0] : ''}! 👋 How can I help you today?\n\nYou can ask me about:\n• 📍 Facility locations\n• 📅 Room availability\n• 🏛️ Organizations\n• 📚 Campus services\n• 🚨 Emergency info\n\nJust type your question!`;
    }
    
    if (lowerQuery.includes('thank')) {
      return "You're welcome! 😊 Is there anything else I can help you with?\n\nFeel free to ask me anything about:\n• Campus facilities\n• Schedules\n• Organizations\n• Services\n• And more!";
    }
    
    // Default response
    return "I'm not quite sure about that. Here are some things I can help you with:\n\n📍 **Facility Locator**\n\"Where is the DIT office?\"\n\"Find the library\"\n\n📅 **Schedule Assistant**\n\"Show vacant rooms\"\n\"My schedule today\"\n\n🏛️ **Organization Info**\n\"BITS officers\"\n\"List organizations\"\n\n📚 **Campus Services**\n\"How to enroll?\"\n\"WiFi connection\"\n\n🚨 **Emergency Info**\n\"Emergency contacts\"\n\"Emergency protocols\"\n\nCould you rephrase your question?";
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
    }, 1000 + Math.random() * 500); // Variable delay for realism
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
              <p>AI-powered campus help • CvSU Imus</p>
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
