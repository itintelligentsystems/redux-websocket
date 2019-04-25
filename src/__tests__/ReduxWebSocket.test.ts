import ReduxWebSocket from '../ReduxWebSocket';
import { Action } from '../types';

declare global {
  namespace NodeJS {
    interface Global {
      WebSocket: any;
    }
  }
}

describe('ReduxWebSocket', () => {
  const store = { dispatch: jest.fn((i: any) => i), getState: () => {} };
  const url = 'ws://fake.com';
  const options = {
    prefix: 'REDUX_WEBSOCKET',
    reconnectInterval: 2000,
  };
  const closeMock = jest.fn();
  const sendMock = jest.fn();
  const addEventListenerMock = jest.fn();
  let reduxWebSocket: ReduxWebSocket;

  beforeEach(() => {
    reduxWebSocket = new ReduxWebSocket(options);

    addEventListenerMock.mockClear();
    closeMock.mockClear();
    sendMock.mockClear();

    global.WebSocket = jest.fn(() => ({
      addEventListener: addEventListenerMock,
      close: closeMock,
      send: sendMock,
    }));
  });

  describe('connect', () => {
    it('creates a new WebSocket instance', () => {
      const action = { type: 'SEND', payload: { url } };

      reduxWebSocket.connect(store, action as Action);

      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      expect(global.WebSocket).toHaveBeenCalledWith(url);
    });

    it('closes any existing connections', () => {
      const action = { type: 'SEND', payload: { url } };

      reduxWebSocket.connect(store, action as Action);
      reduxWebSocket.connect(store, action as Action);

      expect(closeMock).toHaveBeenCalledTimes(1);
      expect(closeMock).toHaveBeenCalledWith(1000, 'WebSocket connection closed by redux-websocket.');
    });

    it('binds all event listeners', () => {
      const action = { type: 'SEND', payload: { url } };

      reduxWebSocket.connect(store, action as Action);

      expect(addEventListenerMock).toHaveBeenCalledTimes(4);
      expect(addEventListenerMock).toHaveBeenCalledWith('close', expect.any(Function));
      expect(addEventListenerMock).toHaveBeenCalledWith('error', expect.any(Function));
      expect(addEventListenerMock).toHaveBeenCalledWith('open', expect.any(Function));
      expect(addEventListenerMock).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('handles a close event', () => {
      const action = { type: 'SEND', payload: { url } };

      reduxWebSocket.connect(store, action as Action);

      const event = addEventListenerMock.mock.calls.find(call => call[0] === 'close');

      event[1]('test event');

      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'REDUX_WEBSOCKET::CLOSED',
        meta: {
          timestamp: expect.any(Date),
        },
        payload: 'test event',
      });
    });
  });

  describe('disconnect', () => {
    it('should close any open connection', () => {
      const action = { type: 'SEND', payload: { url } };

      reduxWebSocket.connect(store, action as Action);
      reduxWebSocket.disconnect();

      expect(closeMock).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if no connection exists', () => {
      expect(() => reduxWebSocket.disconnect())
        .toThrow('Socket connection not initialized. Dispatch WEBSOCKET_CONNECT first');
    });
  });

  describe('send', () => {
    it('should send a JSON message', () => {
      const action = { type: 'SEND', payload: { url } };

      reduxWebSocket.connect(store, action as Action);
      reduxWebSocket.send(null as any, { payload: { test: 'value' } } as any);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith('{"test":"value"}');
    });

    it('should throw an error if no connection exists', () => {
      expect(() => reduxWebSocket.send(null as any, { payload: null } as any))
        .toThrow('Socket connection not initialized. Dispatch WEBSOCKET_CONNECT first');
    });
  });
});
