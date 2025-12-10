import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  MapPin,
  User
} from 'lucide-react';
import { Card, Badge } from '../../components/common';
import './Schedule.css';

const Schedule = () => {
  const [currentWeek, setCurrentWeek] = useState(0);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const schedule = [
    { day: 'Monday', time: '7:30', duration: 2, subject: 'IT Elective 3', section: 'BSIT 4A', room: 'Room 301', instructor: 'Prof. Santos' },
    { day: 'Monday', time: '10:00', duration: 2, subject: 'Software Engineering', section: 'BSIT 3B', room: 'Room 204', instructor: 'Prof. Cruz' },
    { day: 'Monday', time: '14:00', duration: 3, subject: 'Capstone Project', section: 'BSIT 4A', room: 'Room 401', instructor: 'Prof. Garcia' },
    
    { day: 'Tuesday', time: '8:00', duration: 2, subject: 'Database Systems', section: 'BSIT 2A', room: 'CompLab 2', instructor: 'Prof. Reyes' },
    { day: 'Tuesday', time: '13:00', duration: 3, subject: 'Programming 2', section: 'BSIT 1A', room: 'CompLab 1', instructor: 'Prof. Lim' },
    
    { day: 'Wednesday', time: '7:30', duration: 2, subject: 'IT Elective 3', section: 'BSIT 4A', room: 'Room 301', instructor: 'Prof. Santos' },
    { day: 'Wednesday', time: '10:00', duration: 2, subject: 'Software Engineering', section: 'BSIT 3B', room: 'Room 204', instructor: 'Prof. Cruz' },
    
    { day: 'Thursday', time: '8:00', duration: 2, subject: 'Database Systems', section: 'BSIT 2A', room: 'CompLab 2', instructor: 'Prof. Reyes' },
    { day: 'Thursday', time: '13:00', duration: 3, subject: 'Capstone Project', section: 'BSIT 4A', room: 'Room 401', instructor: 'Prof. Garcia' },
    
    { day: 'Friday', time: '9:00', duration: 3, subject: 'System Analysis', section: 'BSIT 3A', room: 'Room 302', instructor: 'Prof. Torres' },
    { day: 'Friday', time: '14:00', duration: 2, subject: 'Web Development', section: 'BSIT 2B', room: 'CompLab 3', instructor: 'Prof. Aquino' },
  ];

  const getTimeIndex = (time) => {
    const hour = parseInt(time.split(':')[0]);
    return hour - 7;
  };

  const getScheduleForSlot = (day, timeSlot) => {
    const hour = parseInt(timeSlot.split(':')[0]);
    return schedule.find(s => {
      const schedHour = parseInt(s.time.split(':')[0]);
      return s.day === day && schedHour <= hour && (schedHour + s.duration) > hour;
    });
  };

  const isFirstSlot = (day, timeSlot, item) => {
    if (!item) return false;
    const schedHour = parseInt(item.time.split(':')[0]);
    const slotHour = parseInt(timeSlot.split(':')[0]);
    return schedHour === slotHour;
  };

  return (
    <div className="schedule-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Schedule</h1>
          <p className="page-subtitle">View your class schedule for this semester</p>
        </div>
        <div className="week-nav">
          <button className="week-nav-btn" onClick={() => setCurrentWeek(currentWeek - 1)}>
            <ChevronLeft size={20} />
          </button>
          <span className="week-label">
            {currentWeek === 0 ? 'This Week' : currentWeek > 0 ? `+${currentWeek} weeks` : `${currentWeek} weeks`}
          </span>
          <button className="week-nav-btn" onClick={() => setCurrentWeek(currentWeek + 1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <Card className="schedule-card" noPadding>
        <div className="schedule-grid">
          {/* Header Row */}
          <div className="schedule-header">
            <div className="time-header">Time</div>
            {days.map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
          </div>

          {/* Time Slots */}
          {timeSlots.map((time, timeIndex) => (
            <div key={time} className="schedule-row">
              <div className="time-cell">{time}</div>
              {days.map(day => {
                const item = getScheduleForSlot(day, time);
                const isFirst = isFirstSlot(day, time, item);
                
                if (item && !isFirst) {
                  return <div key={`${day}-${time}`} className="schedule-cell occupied" />;
                }
                
                return (
                  <div key={`${day}-${time}`} className={`schedule-cell ${item ? 'has-class' : ''}`}>
                    {item && isFirst && (
                      <div 
                        className="class-block"
                        style={{ height: `${item.duration * 60 - 8}px` }}
                      >
                        <div className="class-subject">{item.subject}</div>
                        <div className="class-details">
                          <span><MapPin size={10} /> {item.room}</span>
                          <span><User size={10} /> {item.instructor}</span>
                        </div>
                        <Badge variant="gray" style={{ marginTop: '4px' }}>{item.section}</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Today's Classes */}
      <h2 className="section-title" style={{ marginTop: '32px' }}>Today's Classes</h2>
      <div className="today-classes">
        {schedule
          .filter(s => s.day === 'Thursday')
          .map((item, index) => (
            <Card key={index} className="today-class-card">
              <div className="today-class-time">
                <Clock size={16} />
                {item.time}
              </div>
              <div className="today-class-info">
                <h4>{item.subject}</h4>
                <p>{item.section} • {item.instructor}</p>
              </div>
              <div className="today-class-room">
                <MapPin size={14} />
                {item.room}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
};

export default Schedule;
