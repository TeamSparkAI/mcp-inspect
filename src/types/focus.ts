export type FocusArea =
  | 'serverList'
  | 'tabs'
  // Used by Resources/Prompts/Tools/Notifications
  | 'tabContent'
  // Used only when activeTab === 'history'
  | 'historyList'
  | 'historyDetail';
