import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  MapPin,
  User,
  Loader
} from 'lucide-react';
import { Card, Badge } from '../../components/common';
import { getSchedules } from '../../services/firestoreService';
import './Schedule.css';

const Schedule = () => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const data = await getSchedules();
        setSchedule(data);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

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

  // Get current day name
  const getCurrentDay = () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[new Date().getDay()];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

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
        {schedule.filter(s => s.day === getCurrentDay()).length === 0 ? (
          <Card style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--gray-500)' }}>No classes scheduled for today</p>
          </Card>
        ) : (
          schedule
            .filter(s => s.day === getCurrentDay())
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
            ))
        )}
      </div>
    </div>
  );
};

export default Schedule;
