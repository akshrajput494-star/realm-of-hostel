import React from 'react'
import { Icon } from '../lib/icons'
import { LinkButton, PrivacyNote, SectionHead } from '../lib/ui'

const PRIVACY_SECTIONS = [
  {
    title: '1. What ROH stores',
    body: 'ROH separates public hostel data from private resident data. Public data covers rooms, beds, occupancy status, fees, facilities, mess menus, transport schedules and notices. Private data covers a resident’s name, roll number, course, academic year, contact number, guardian details, fee ledger and complaint history.',
  },
  {
    title: '2. What visitors can see',
    body: 'Anyone browsing without signing in can see room numbers, block names, floors, AC/Non-AC type, seater capacity, monthly and semester fees, facilities, and the status of every bed. Visitors never see who occupies a bed, nor any personal, academic or financial detail of a resident.',
  },
  {
    title: '3. Who can see resident details',
    body: 'A resident’s private record is accessible to that resident, to the warden of their hostel, and to the estate administrator. Mess staff and transport managers receive only the data required for their function. Roommate information is disclosed only to verified residents of the same room.',
  },
  {
    title: '4. Visibility of your own presence',
    body: 'Even inside a room, an occupied bed is displayed to the public as simply “Occupied”. No name, initial, photograph or roll number is ever rendered for a public visitor — in the room explorer, the 3D hostel map, dashboards or comparison views.',
  },
  {
    title: '5. Data collection & retention',
    body: 'In this hackathon build, no data leaves your browser. Shortlists, applications, complaints, payments and notices are held in local storage on your device and can be cleared at any time with the “Reset demo data” action in the footer. A production deployment would store records in the institute database with role-scoped access and an audit trail.',
  },
  {
    title: '6. Payments',
    body: 'No payment gateway is connected in this demo. The “Pay Now” flow simulates a successful transaction locally. In production, card and UPI details would be handled directly by a PCI-DSS compliant gateway and never stored by ROH.',
  },
  {
    title: '7. Your controls',
    body: 'You can shortlist or remove rooms, withdraw a pending application, reopen a resolved complaint, and request correction of any inaccurate record through your warden. Administrators can also reset the demo dataset at any time.',
  },
  {
    title: '8. Contact',
    body: 'Questions about privacy can be raised with the hostel estate office at helpdesk@roh.edu or on +91 98110 22110. This policy is written for a campus demonstration and would be reviewed by the institute’s data governance committee before rollout.',
  },
]

const TERMS_SECTIONS = [
  {
    title: '1. Demo status of this build',
    body: 'Realm of Hostel (ROH) is a hackathon demonstration. All hostels, rooms, beds, students, complaints, payments, menus, routes and notices shown are synthetic sample data. No real allotment, payment or service request is created by using this website.',
  },
  {
    title: '2. Acceptable use',
    body: 'You agree to use ROH only to explore hostel information, simulate applications, raise sample complaints and review dashboards. You must not attempt to extract personal data, misrepresent an allotment, or use the platform to harass any individual.',
  },
  {
    title: '3. Accuracy of information',
    body: 'Fee figures, timings, seat counts and availability are illustrative. Real hostel policy — including refund rules, curfew, discipline and allotment priority — is governed by the institute’s hostel regulations and the warden’s office.',
  },
  {
    title: '4. Roles and permissions',
    body: 'Dashboard features depend on the role you sign in with. Demo accounts are shared for evaluation purposes; do not enter confidential information into any field of this build.',
  },
  {
    title: '5. Payments disclaimer',
    body: 'No money is collected. The payment module is a simulation and produces fake receipt numbers for demonstration. Do not attempt to use it to settle a real fee.',
  },
  {
    title: '6. Availability',
    body: 'The demo runs entirely in your browser. Clearing site data, switching devices or using private browsing will reset your saved shortlist, applications, complaints and notices.',
  },
  {
    title: '7. Intellectual property',
    body: 'The ROH name, visual identity and application design are presented for the hackathon evaluation. Underlying frameworks — React and TypeScript — remain under their respective open-source licences.',
  },
  {
    title: '8. Contact',
    body: 'For questions about these terms, contact the estate helpdesk at helpdesk@roh.edu.',
  },
]

export function Privacy() {
  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow="Legal"
        title="Privacy Policy"
        sub="How ROH separates public hostel availability from private resident records — and exactly who can see what."
      />
      <div style={{ marginBottom: 24 }}><PrivacyNote /></div>

      <div className="grid g2" style={{ gap: 18 }}>
        {PRIVACY_SECTIONS.map((s) => (
          <div className="card" key={s.title}>
            <div className="row" style={{ gap: 10, marginBottom: 10 }}>
              <span className="pin"><Icon name="shield" size={12} /></span>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{s.title}</h3>
            </div>
            <p className="small" style={{ margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
        <LinkButton to="/rooms" variant="primary" icon="bed">Explore Rooms</LinkButton>
        <LinkButton to="/terms" variant="ghost" icon="clipboard">Terms of Use</LinkButton>
      </div>
    </div>
  )
}

export function Terms() {
  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow="Legal"
        title="Terms of Use"
        sub="The ground rules for using the Realm of Hostel demonstration build."
      />
      <div className="col" style={{ gap: 18 }}>
        {TERMS_SECTIONS.map((s) => (
          <div className="card" key={s.title}>
            <div className="row" style={{ gap: 10, marginBottom: 10 }}>
              <span className="pin"><Icon name="clipboard" size={12} /></span>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{s.title}</h3>
            </div>
            <p className="small" style={{ margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
        <LinkButton to="/privacy" variant="primary" icon="lock">Privacy Policy</LinkButton>
        <LinkButton to="/" variant="ghost" icon="home">Back to Home</LinkButton>
      </div>
    </div>
  )
}
