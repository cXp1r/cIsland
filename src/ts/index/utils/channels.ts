const overlaysChannel = new MessageChannel();
const pagesChannel = new MessageChannel();
const subPagesChannel = new MessageChannel();

export const overlaysOut = overlaysChannel.port1;
export const overlaysIn = overlaysChannel.port2;

export const pagesOut = pagesChannel.port1;
export const pagesIn = pagesChannel.port2;

export const subPagesOut = subPagesChannel.port1;
export const subPagesIn = subPagesChannel.port2;