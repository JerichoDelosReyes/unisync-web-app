import { useState } from 'react'

/**
 * AI Chat Component
 * 
 * Floating chatbot that appears in the bottom right corner
 * Accessible to all authenticated users
 */
export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Hello! 👋 How can I assist you today?' }
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
    }, 800)
  }

  const generateBotResponse = (userInput) => {
    const input = userInput.toLowerCase()

    // Help topics
    if (input.includes('help') || input.includes('how')) {
      return 'I can help you with announcements, schedules, room bookings, and more! What would you like to know?'
    }
    if (input.includes('announcement')) {
      return 'You can view all announcements in the Announcements section. Filter by priority, category, or organization. You can also create new announcements if you have the appropriate role.'
    }
    if (input.includes('schedule') || input.includes('class')) {
      return 'Visit the Schedule page to view your classes, lectures, and academic events. You can also check room availability there.'
    }
    if (input.includes('room')) {
      return 'The Room Finder feature helps you locate available rooms and facilities on campus. Check the Announcements section for facility information.'
    }
    if (input.includes('organization')) {
      return 'You can explore student organizations in the Announcements tab. Click on any organization to see their announcements and updates.'
    }
    if (input.includes('hi') || input.includes('hello') || input.includes('hey')) {
      return 'Hello! 👋 How can I assist you with UNISYNC today?'
    }
    if (input.includes('thanks') || input.includes('thank you')) {
      return 'You\'re welcome! Is there anything else you\'d like to know? 😊'
    }
    
    // Default response
    return 'That\'s interesting! I can help you with announcements, schedules, organizations, and more. What specific topic would you like assistance with?'
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group"
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
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-2xl p-4 flex items-center justify-between">
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
