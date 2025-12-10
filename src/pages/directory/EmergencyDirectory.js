import React from 'react';
import { 
  Phone, 
  MapPin, 
  Clock,
  AlertTriangle,
  Heart,
  Shield,
  Users,
  BookOpen
} from 'lucide-react';
import { Card } from '../../components/common';
import './Directory.css';

const EmergencyDirectory = () => {
  const emergencyContacts = [
    {
      name: 'Civil Security Office',
      icon: Shield,
      location: 'Old Building, Ground Floor (Main Gate)',
      hours: '24/7',
      phone: '(046) XXX-XXXX',
      description: 'For campus security, room access requests, and emergency response.',
      color: 'error'
    },
    {
      name: 'Health Service Unit',
      icon: Heart,
      location: 'Old Building, Ground Floor',
      hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
      phone: '(046) XXX-XXXX',
      description: 'Medical consultations, first aid, and health certificates.',
      color: 'success'
    },
    {
      name: 'Guidance Office',
      icon: Users,
      location: 'New Building, 2nd Floor',
      hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
      phone: '(046) XXX-XXXX',
      description: 'Counseling services, career guidance, and student welfare.',
      color: 'primary'
    },
    {
      name: 'Office of Student Affairs',
      icon: BookOpen,
      location: 'New Building, 1st Floor',
      hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
      phone: '(046) XXX-XXXX',
      description: 'Student organizations, events, and disciplinary matters.',
      color: 'warning'
    },
  ];

  const emergencyProtocols = [
    {
      title: 'Fire Emergency',
      steps: [
        'Activate the nearest fire alarm',
        'Evacuate using the nearest exit',
        'Do not use elevators',
        'Proceed to the designated assembly area',
        'Report to your class representative'
      ]
    },
    {
      title: 'Medical Emergency',
      steps: [
        'Call for help immediately',
        'Do not move the injured person',
        'Contact Health Service Unit',
        'Perform first aid if trained',
        'Wait for medical personnel'
      ]
    },
    {
      title: 'Earthquake',
      steps: [
        'DROP, COVER, and HOLD ON',
        'Stay away from windows and heavy objects',
        'After shaking stops, evacuate calmly',
        'Proceed to open areas',
        'Wait for announcements'
      ]
    },
  ];

  return (
    <div className="directory-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Emergency & Services Directory</h1>
          <p className="page-subtitle">Important contacts and emergency protocols</p>
        </div>
      </div>

      {/* Emergency Alert */}
      <div className="emergency-alert">
        <AlertTriangle size={24} />
        <div>
          <strong>In case of emergency, call Civil Security immediately</strong>
          <p>Available 24/7 at the main gate or via phone</p>
        </div>
      </div>

      {/* Contact Cards */}
      <div className="contacts-grid">
        {emergencyContacts.map((contact, index) => (
          <Card key={index} className="contact-card">
            <div className={`contact-icon ${contact.color}`}>
              <contact.icon size={24} />
            </div>
            <h3 className="contact-name">{contact.name}</h3>
            <p className="contact-description">{contact.description}</p>
            
            <div className="contact-details">
              <div className="contact-detail">
                <MapPin size={14} />
                <span>{contact.location}</span>
              </div>
              <div className="contact-detail">
                <Clock size={14} />
                <span>{contact.hours}</span>
              </div>
              <div className="contact-detail">
                <Phone size={14} />
                <span>{contact.phone}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Emergency Protocols */}
      <h2 className="section-title">Emergency Protocols</h2>
      <div className="protocols-grid">
        {emergencyProtocols.map((protocol, index) => (
          <Card key={index} className="protocol-card">
            <h3 className="protocol-title">{protocol.title}</h3>
            <ol className="protocol-steps">
              {protocol.steps.map((step, stepIndex) => (
                <li key={stepIndex}>{step}</li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EmergencyDirectory;
