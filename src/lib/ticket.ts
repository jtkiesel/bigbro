  export enum TButtonId {
    Close = 'close',
    Ticket = 'ticket',
  }
  
  export enum ModalId {
    Ticket = 'ticket',
    Close = 'close',
  }
  
  export enum InputId {
    Title = 'title',
    Explanation = 'explanation',
    Resolution = 'resolution,'
  }
  
  export interface TicketLog {
    _id: {
      guild: string;
      channel: string;
      user: string;
    };
    title: string;
    number: number;
    open: boolean;
  }