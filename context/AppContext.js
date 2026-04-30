import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

const INITIAL_DRAFTS = {
  '1': [
    {
      id: 'd1',
      timestamp: 'Today 2:14 PM',
      items: [
        { id: 'i1', name: 'Type-S mortar', quantity: '4 bags', spec: '80 lb each' },
        { id: 'i2', name: 'Plywood sheets', quantity: '10 sheets', spec: '3/4" thick' },
        { id: 'i3', name: 'Rebar #4', quantity: '20 sticks', spec: '20 ft each' },
      ],
      needed: 'Fri AM',
      delivery: 'North entrance',
      contact: '',
      urgency: '',
      warning: 'Fri AM · North entrance · Urgency not set',
    },
    {
      id: 'd2',
      timestamp: 'Yesterday 9:47 AM',
      items: [
        { id: 'i4', name: 'Hydraulic cement', quantity: '5 bags', spec: '94 lb each' },
      ],
      needed: '',
      delivery: '',
      contact: '',
      urgency: '',
      warning: 'Delivery date, location missing',
    },
  ],
  '2': [
    {
      id: 'd3',
      timestamp: 'Today 10:30 AM',
      items: [
        { id: 'i5', name: 'PVC pipe 4"', quantity: '20 lengths', spec: '10 ft each' },
        { id: 'i6', name: 'Concrete mix', quantity: '15 bags', spec: '60 lb each' },
      ],
      needed: '',
      delivery: '',
      contact: '',
      urgency: '',
      warning: 'Urgency not set',
    },
  ],
};

export function AppProvider({ children }) {
  const [drafts, setDrafts] = useState(INITIAL_DRAFTS);

  function addDraft(projectId, draft) {
    setDrafts(prev => ({
      ...prev,
      [projectId]: [draft, ...(prev[projectId] || [])],
    }));
  }

  function removeDraft(projectId, draftId) {
    setDrafts(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(d => d.id !== draftId),
    }));
  }

  function getDraftCount(projectId) {
    return (drafts[projectId] || []).length;
  }

  function getDrafts(projectId) {
    return drafts[projectId] || [];
  }

  return (
    <AppContext.Provider value={{ addDraft, removeDraft, getDraftCount, getDrafts }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
