import { io, Socket } from "socket.io-client";

// Test configuration
const SOCKET_URL = "https://testsocketio-roqet.up.railway.app";

// Test results interface
interface TestResult {
  test: string;
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

interface ConnectionTestResults {
  serverReachable: TestResult;
  socketConnection: TestResult;
  eventCommunication: TestResult;
  transportType: TestResult;
  overall: TestResult;
}

// Test if server is reachable via HTTP
export const testServerReachability = async (): Promise<TestResult> => {
  try {
    console.log('🔍 Testing server reachability...');
    
    const response = await fetch(`${SOCKET_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ReactNative'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server reachable:', data);
      return {
        test: 'Server Reachability',
        success: true,
        message: 'Server is reachable via HTTP',
        details: data,
        timestamp: new Date().toISOString()
      };
    } else {
      console.log('❌ Server responded with error:', response.status);
      return {
        test: 'Server Reachability',
        success: false,
        message: `Server responded with status: ${response.status}`,
        details: { status: response.status, statusText: response.statusText },
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('❌ Server reachability test failed:', error);
    return {
      test: 'Server Reachability',
      success: false,
      message: `Failed to reach server: ${errorMessage}`,
      details: { error: errorMessage },
      timestamp: new Date().toISOString()
    };
  }
};

// Test Socket.IO connection
export const testSocketConnection = (): Promise<TestResult> => {
  return new Promise((resolve) => {
    console.log('🔍 Testing Socket.IO connection...');
    
    const testSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      timeout: 10000,
      forceNew: true,
      query: {
        type: "customer",
        id: "test_user_" + Date.now()
      },
      extraHeaders: {
        "User-Agent": "ReactNative"
      }
    });

    const timeout = setTimeout(() => {
      testSocket.disconnect();
      resolve({
        test: 'Socket Connection',
        success: false,
        message: 'Connection timeout after 10 seconds',
        details: { timeout: 10000 },
        timestamp: new Date().toISOString()
      });
    }, 10000);

    testSocket.on("connect", () => {
      clearTimeout(timeout);
      console.log('✅ Socket connected successfully');
      console.log('📡 Transport:', testSocket.io.engine.transport.name);
      console.log('🔗 Socket ID:', testSocket.id);
      
      const result: TestResult = {
        test: 'Socket Connection',
        success: true,
        message: 'Socket.IO connection established successfully',
        details: {
          socketId: testSocket.id,
          transport: testSocket.io.engine.transport.name,
          connected: testSocket.connected
        },
        timestamp: new Date().toISOString()
      };
      
      testSocket.disconnect();
      resolve(result);
    });

    testSocket.on("connect_error", (error) => {
      clearTimeout(timeout);
      console.log('❌ Socket connection error:', error);
      resolve({
        test: 'Socket Connection',
        success: false,
        message: `Connection failed: ${error.message}`,
        details: {
          error: error.message,
          type: (error as any).type,
          context: (error as any).context
        },
        timestamp: new Date().toISOString()
      });
    });
  });
};

// Test event communication
export const testEventCommunication = (): Promise<TestResult> => {
  return new Promise((resolve) => {
    console.log('🔍 Testing event communication...');
    
    const testSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      timeout: 15000,
      forceNew: true,
      query: {
        type: "customer",
        id: "test_user_" + Date.now()
      }
    });

    const timeout = setTimeout(() => {
      testSocket.disconnect();
      resolve({
        test: 'Event Communication',
        success: false,
        message: 'Event communication timeout',
        details: { timeout: 15000 },
        timestamp: new Date().toISOString()
      });
    }, 15000);

    testSocket.on("connect", () => {
      console.log('✅ Connected, testing event communication...');
      
      // Test basic event
      testSocket.emit("test_event", { message: "Hello from React Native!", timestamp: Date.now() });
      
      testSocket.on("test_response", (data) => {
        clearTimeout(timeout);
        console.log('✅ Event communication successful:', data);
        
        const result: TestResult = {
          test: 'Event Communication',
          success: true,
          message: 'Event communication working correctly',
          details: {
            received: data,
            socketId: testSocket.id,
            transport: testSocket.io.engine.transport.name
          },
          timestamp: new Date().toISOString()
        };
        
        testSocket.disconnect();
        resolve(result);
      });
    });

    testSocket.on("connect_error", (error) => {
      clearTimeout(timeout);
      console.log('❌ Event communication failed due to connection error:', error);
      resolve({
        test: 'Event Communication',
        success: false,
        message: `Event communication failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    });
  });
};

// Test transport type
export const testTransportType = (): Promise<TestResult> => {
  return new Promise((resolve) => {
    console.log('🔍 Testing transport type...');
    
    const testSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      timeout: 10000,
      forceNew: true,
      query: {
        type: "customer",
        id: "test_user_" + Date.now()
      }
    });

    const timeout = setTimeout(() => {
      testSocket.disconnect();
      resolve({
        test: 'Transport Type',
        success: false,
        message: 'Transport test timeout',
        details: { timeout: 10000 },
        timestamp: new Date().toISOString()
      });
    }, 10000);

    testSocket.on("connect", () => {
      clearTimeout(timeout);
      const transport = testSocket.io.engine.transport.name;
      console.log('✅ Transport type:', transport);
      
      const isWebSocket = transport === 'websocket';
      const result: TestResult = {
        test: 'Transport Type',
        success: isWebSocket,
        message: isWebSocket ? 'Using WebSocket transport' : `Using ${transport} transport (not recommended)`,
        details: {
          transport: transport,
          isWebSocket: isWebSocket,
          recommended: isWebSocket
        },
        timestamp: new Date().toISOString()
      };
      
      testSocket.disconnect();
      resolve(result);
    });

    testSocket.on("connect_error", (error) => {
      clearTimeout(timeout);
      console.log('❌ Transport test failed:', error);
      resolve({
        test: 'Transport Type',
        success: false,
        message: `Transport test failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    });
  });
};

// Run comprehensive connection test
export const runConnectionTest = async (): Promise<ConnectionTestResults> => {
  console.log('🚀 Starting comprehensive connection test...');
  console.log('🌐 Server URL:', SOCKET_URL);
  
  const results: ConnectionTestResults = {
    serverReachable: await testServerReachability(),
    socketConnection: await testSocketConnection(),
    eventCommunication: await testEventCommunication(),
    transportType: await testTransportType(),
    overall: {
      test: 'Overall Test',
      success: false,
      message: 'Test not completed',
      timestamp: new Date().toISOString()
    }
  };
  
  // Calculate overall success
  const allTests = [
    results.serverReachable,
    results.socketConnection,
    results.eventCommunication,
    results.transportType
  ];
  
  const successCount = allTests.filter(test => test.success).length;
  const totalTests = allTests.length;
  
  results.overall = {
    test: 'Overall Test',
    success: successCount === totalTests,
    message: `${successCount}/${totalTests} tests passed`,
    details: {
      passed: successCount,
      total: totalTests,
      percentage: Math.round((successCount / totalTests) * 100)
    },
    timestamp: new Date().toISOString()
  };
  
  // Log results
  console.log('📊 Test Results:');
  Object.values(results).forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.test}: ${result.message}`);
    if (result.details) {
      console.log('   Details:', result.details);
    }
  });
  
  return results;
};

// Quick test function for debugging
export const quickTest = async () => {
  console.log('🔧 Quick connection test...');
  
  try {
    // Test server reachability
    const healthResponse = await fetch(`${SOCKET_URL}/health`);
    console.log('🌐 Server health:', healthResponse.ok ? 'OK' : 'FAILED');
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('📊 Server stats:', healthData);
    }
    
    // Test socket connection
    const socketResult = await testSocketConnection();
    console.log('🔌 Socket connection:', socketResult.success ? 'OK' : 'FAILED');
    
    return {
      serverReachable: healthResponse.ok,
      socketConnected: socketResult.success,
      details: {
        health: healthResponse.ok ? await healthResponse.json() : null,
        socket: socketResult.details
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('❌ Quick test failed:', error);
    return {
      serverReachable: false,
      socketConnected: false,
      error: errorMessage
    };
  }
}; 