import { useState } from 'react'

/**
 * AI Chat Component
 * 
 * Floating chatbot that appears in the bottom right corner
 * Accessible to all authenticated users
 * Enhanced with expanded dataset, synonyms, and Tagalog/English NLP
 */

// Synonym mappings for flexible query matching
const synonymMappings = {
  // Schedule related
  schedule: ['sched', 'klase', 'class', 'classes', 'subject', 'subjects', 'timetable', 'time table', 'lecture', 'lectures', 'oras', 'iskedyul'],
  view: ['check', 'see', 'look', 'find', 'show', 'display', 'tingnan', 'tignan', 'pakita'],
  
  // Announcement related  
  announcement: ['announce', 'announcements', 'post', 'posts', 'news', 'update', 'updates', 'balita', 'anunsyo', 'abiso', 'notice', 'notices'],
  create: ['make', 'new', 'add', 'write', 'compose', 'gawa', 'gumawa', 'lumikha', 'publish'],
  
  // Room related
  room: ['rooms', 'classroom', 'classrooms', 'venue', 'venues', 'location', 'kwarto', 'silid', 'lugar', 'building', 'facility', 'facilities'],
  available: ['free', 'open', 'vacant', 'empty', 'bakante', 'libre', 'available'],
  
  // Organization related
  organization: ['org', 'orgs', 'organizations', 'club', 'clubs', 'society', 'societies', 'grupo', 'samahan', 'organisasyon'],
  join: ['member', 'membership', 'apply', 'register', 'sumali', 'mag-apply', 'mag-join'],
  
  // Help related
  help: ['assist', 'support', 'guide', 'how', 'what', 'paano', 'ano', 'tulong', 'makatulong'],
  
  // Profile related
  profile: ['account', 'settings', 'info', 'information', 'personal', 'details', 'profile', 'impormasyon'],
  
  // Faculty related
  faculty: ['teacher', 'professor', 'instructor', 'sir', 'maam', 'guro', 'propesor', 'titser'],
  
  // Student related
  student: ['estudyante', 'mag-aaral', 'learner', 'pupil'],
  
  // Common actions
  edit: ['change', 'modify', 'update', 'baguhin', 'palitan', 'i-edit'],
  delete: ['remove', 'cancel', 'tanggalin', 'burahin', 'i-delete'],
  
  // Greetings (Tagalog/English)
  hello: ['hi', 'hey', 'kumusta', 'kamusta', 'musta', 'hello', 'good morning', 'good afternoon', 'good evening', 'magandang umaga', 'magandang hapon', 'magandang gabi']
}

// Normalize text - convert to lowercase and handle common variations
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/[?!.,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Check if input contains any synonym from a category
const matchesSynonym = (input, category) => {
  const normalizedInput = normalizeText(input)
  const synonyms = synonymMappings[category] || []
  return synonyms.some(synonym => normalizedInput.includes(synonym)) || normalizedInput.includes(category)
}

// Extract keywords from input
const extractKeywords = (input) => {
  const normalized = normalizeText(input)
  const matches = []
  
  for (const [category, synonyms] of Object.entries(synonymMappings)) {
    if (synonyms.some(syn => normalized.includes(syn)) || normalized.includes(category)) {
      matches.push(category)
    }
  }
  
  return matches
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Hello! How can I assist you today? (Kumusta! Paano kita matutulungan?)' }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!inputValue.trim()) return

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue
    }

    setMessages([...messages, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate bot response delay
    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: generateBotResponse(inputValue)
      }
      setMessages(prev => [...prev, botMessage])
      setIsLoading(false)
    }, 600)
  }

  const generateBotResponse = (userInput) => {
    const keywords = extractKeywords(userInput)
    const normalizedInput = normalizeText(userInput)

    // Greeting responses (handles both Tagalog and English)
    if (matchesSynonym(userInput, 'hello')) {
      const greetings = [
        'Hello! How can I help you with UNISYNC today?',
        'Kumusta! Paano kita matutulungan sa UNISYNC?',
        'Hi there! Ask me about announcements, schedules, rooms, or organizations.'
      ]
      return greetings[Math.floor(Math.random() * greetings.length)]
    }

    // Thank you responses
    if (normalizedInput.includes('thank') || normalizedInput.includes('salamat') || normalizedInput.includes('maraming salamat')) {
      return 'You\'re welcome! Is there anything else I can help you with? (Walang anuman! May iba pa ba akong maitutulong?)'
    }

    // Schedule related queries
    if (matchesSynonym(userInput, 'schedule')) {
      if (matchesSynonym(userInput, 'view') || normalizedInput.includes('where') || normalizedInput.includes('saan')) {
        return 'You can view your class schedule in the Schedule page. Navigate to Schedule from the sidebar menu. Your classes will appear based on your uploaded registration form.\n\n(Makikita mo ang iyong schedule sa Schedule page. Pumunta sa Schedule mula sa sidebar menu.)'
      }
      if (normalizedInput.includes('upload') || normalizedInput.includes('add') || normalizedInput.includes('registration')) {
        return 'To add your schedule, go to the Schedule page and click "Add Registration Form" to upload your COR (Certificate of Registration) PDF file. The system will automatically extract your classes.\n\n(Para idagdag ang schedule mo, pumunta sa Schedule page at i-click ang "Add Registration Form".)'
      }
      if (matchesSynonym(userInput, 'faculty') || normalizedInput.includes('professor') || normalizedInput.includes('teacher')) {
        return 'Faculty members can claim schedule codes in the Schedule page under "Claim Classes" tab. This links you to students who have those subjects. Your teaching schedule will appear automatically once students upload their registration forms.\n\n(Ang mga guro ay pwedeng mag-claim ng schedule codes para makonekta sa mga estudyante.)'
      }
      return 'The Schedule page shows your class timetable. Upload your registration form to see your classes, or if you\'re faculty, claim schedule codes to link with students.\n\n(Ang Schedule page ay nagpapakita ng iyong mga klase.)'
    }

    // Announcement related queries  
    if (matchesSynonym(userInput, 'announcement')) {
      if (matchesSynonym(userInput, 'create') || normalizedInput.includes('post') || normalizedInput.includes('make')) {
        return 'To create an announcement, go to Announcements page and click the "Create Announcement" button. You can add title, content, images/videos, set priority, and target specific audiences. Class Representatives and above can post announcements.\n\n(Para gumawa ng announcement, pumunta sa Announcements page at i-click ang "Create Announcement".)'
      }
      if (normalizedInput.includes('filter') || normalizedInput.includes('find') || normalizedInput.includes('search')) {
        return 'You can filter announcements by organization using the organization logos at the top. Click on any organization logo to see only their posts. Announcements are also filtered based on your department and enrolled organizations.\n\n(Pwede mong i-filter ang announcements ayon sa organization.)'
      }
      if (normalizedInput.includes('priority') || normalizedInput.includes('urgent') || normalizedInput.includes('important')) {
        return 'Announcements have priority levels: Urgent (red), High (orange), Normal (blue), and Low (gray). Urgent announcements are pinned at the top for visibility.\n\n(May priority levels ang mga announcement: Urgent, High, Normal, at Low.)'
      }
      return 'Visit the Announcements page to see all campus updates, events, and news. You can view posts from your department, organizations, and campus-wide announcements.\n\n(Pumunta sa Announcements page para makita ang mga balita at updates.)'
    }

    // Room related queries
    if (matchesSynonym(userInput, 'room')) {
      if (matchesSynonym(userInput, 'available') || normalizedInput.includes('find') || normalizedInput.includes('hanap')) {
        return 'Use the Room Finder feature to check available rooms and facilities on campus. Go to Find Room from the sidebar to see room availability by building and time.\n\n(Gamitin ang Room Finder para mahanap ang available na mga silid.)'
      }
      if (normalizedInput.includes('book') || normalizedInput.includes('reserve') || normalizedInput.includes('ireserba')) {
        return 'Room booking features help you reserve venues for events or activities. Check the Rooms page for available facilities and booking options.\n\n(Ang room booking ay nagpapahintulot na mag-reserve ng mga venue.)'
      }
      return 'The Room Finder helps you locate available classrooms and facilities on campus. Navigate to Find Room in the sidebar.\n\n(Ang Room Finder ay tumutulong mahanap ang mga available na silid.)'
    }

    // Organization related queries
    if (matchesSynonym(userInput, 'organization')) {
      if (matchesSynonym(userInput, 'join') || normalizedInput.includes('member')) {
        return 'To join an organization, look for their announcements in the Announcements page and contact them for membership details. Organizations like CSG, BITS, CSC, and others regularly post about membership drives.\n\n(Para sumali sa organization, maghanap ng kanilang announcements at makipag-ugnay para sa membership.)'
      }
      if (normalizedInput.includes('list') || normalizedInput.includes('all') || normalizedInput.includes('available')) {
        return 'CvSU Imus Campus has various organizations: CSG (Student Government), BITS (IT Society), CSC (Computer Science Clique), BMS (Business Management), CYLE (Entrepreneurship), EDGE (Education), and many more. Check the Announcements page to see posts from each org.\n\n(Maraming organization sa CvSU Imus: CSG, BITS, CSC, BMS, at iba pa.)'
      }
      return 'Student organizations post their updates and events in the Announcements section. You can filter by organization to see specific group content.\n\n(Ang mga organization ay nagpo-post ng kanilang updates sa Announcements section.)'
    }

    // Profile related queries
    if (matchesSynonym(userInput, 'profile')) {
      if (matchesSynonym(userInput, 'edit') || normalizedInput.includes('update') || normalizedInput.includes('change')) {
        return 'You can update your profile information by clicking on your profile picture in the sidebar and going to account settings. Edit your name, department, and other details there.\n\n(Pwede mong i-update ang iyong profile sa account settings.)'
      }
      return 'Your profile contains your personal information, role, department, and organization memberships. Access it from the sidebar or by clicking your profile picture.\n\n(Ang iyong profile ay naglalaman ng iyong personal na impormasyon.)'
    }

    // Faculty role queries
    if (matchesSynonym(userInput, 'faculty')) {
      if (normalizedInput.includes('request') || normalizedInput.includes('apply') || normalizedInput.includes('become')) {
        return 'To request faculty role, go to Dashboard and click "Request Faculty Role". Upload your faculty ID for verification. An admin will review your request.\n\n(Para mag-request ng faculty role, pumunta sa Dashboard at i-click ang "Request Faculty Role".)'
      }
      if (normalizedInput.includes('schedule') || normalizedInput.includes('class')) {
        return 'Faculty members can see their teaching schedule by claiming schedule codes in the Schedule page. Go to "Claim Classes" tab and enter the schedule codes from student registration forms.\n\n(Ang mga guro ay pwedeng makita ang kanilang schedule sa pamamagitan ng pag-claim ng schedule codes.)'
      }
      return 'Faculty members have access to teaching schedules, student lists, and can post announcements. Request faculty role verification from the Dashboard if you\'re a faculty member.\n\n(Ang mga faculty ay may access sa teaching schedules at pwedeng mag-post ng announcements.)'
    }

    // Help/General queries
    if (matchesSynonym(userInput, 'help') || normalizedInput.includes('what can you do') || normalizedInput.includes('ano pwede mo')) {
      return 'I can help you with:\n• Announcements - viewing, creating, filtering posts\n• Schedule - viewing classes, uploading registration form\n• Room Finder - finding available rooms\n• Organizations - learning about campus orgs\n• Profile - updating your information\n\nJust ask in English or Tagalog!\n\n(Pwede akong tumulong sa announcements, schedule, rooms, organizations, at profile. Magtanong lang sa English o Tagalog!)'
    }

    // Class representative queries
    if (normalizedInput.includes('class rep') || normalizedInput.includes('representative') || normalizedInput.includes('class representative')) {
      return 'Class Representatives can create announcements for their section, moderate comments, and represent their class. To become one, contact your department head or student affairs.\n\n(Ang Class Representatives ay pwedeng gumawa ng announcements para sa kanilang section.)'
    }

    // Moderation queries
    if (normalizedInput.includes('moderat') || normalizedInput.includes('review') || normalizedInput.includes('pending')) {
      return 'Admins can moderate announcements and comments through the Moderation page. Pending items are reviewed for content before being published.\n\n(Ang mga Admin ay pwedeng mag-moderate ng announcements sa Moderation page.)'
    }

    // Default response with suggestions
    return 'I can help you with announcements, schedules, rooms, organizations, and more! Try asking:\n• "How do I view my schedule?"\n• "Paano gumawa ng announcement?"\n• "Where can I find available rooms?"\n• "What organizations are on campus?"\n\n(Hindi ko maintindihan. Subukan mong magtanong tungkol sa schedules, announcements, o rooms.)'
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group"
      >
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 2h6v2h-6V2zm-2 4h2v2H7V6zm8 0h2v2h-2V6z"/>
          <path d="M5 8h14v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8z"/>
          <circle cx="9" cy="13" r="1.5"/>
          <circle cx="15" cy="13" r="1.5"/>
          <path d="M9 17h6v1H9v-1z"/>
        </svg>
        <span className="absolute bottom-16 right-0 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          AI Assistant
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="bg-primary text-white rounded-t-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 2h6v2h-6V2zm-2 4h2v2H7V6zm8 0h2v2h-2V6z"/>
              <path d="M5 8h14v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8z"/>
              <circle cx="9" cy="13" r="1.5"/>
              <circle cx="15" cy="13" r="1.5"/>
              <path d="M9 17h6v1H9v-1z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold">UNISYNC AI</h3>
            <p className="text-xs text-green-100">Always here to help</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-green-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white rounded-b-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg px-4 py-2 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
