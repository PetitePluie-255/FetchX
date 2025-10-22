# FetchX

[![npm version](https://img.shields.io/npm/v/fetchx.svg)](https://www.npmjs.com/package/fetchx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

A modern, lightweight HTTP client library built on the native fetch API with an axios-like interface. Perfect for TypeScript projects that need a reliable, type-safe HTTP client.

## ✨ Features

- 🚀 **Modern**: Built on native fetch API, no external dependencies
- 🔄 **Axios Compatible**: Easy migration from axios with familiar API
- 🛡️ **Type Safe**: Full TypeScript support with comprehensive type definitions
- 🔧 **Interceptors**: Powerful request/response interceptor system
- ⏱️ **Timeout Control**: Built-in timeout with AbortController
- 📦 **Lightweight**: Zero runtime dependencies, minimal bundle size
- 🎯 **Error Handling**: Consistent error handling with detailed error information
- 🔄 **Auto Serialization**: Automatic JSON serialization and response parsing

## 📦 Installation

```bash
# Using pnpm (recommended)
pnpm add fetchx

# Using npm
npm install fetchx

# Using yarn
yarn add fetchx
```

## 🚀 Quick Start

```typescript
import { createFetchX } from 'fetchx';

// Create instance with configuration
const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Make requests with full TypeScript support
interface User {
  id: number;
  name: string;
  email: string;
}

const users = await api.get<User[]>('/users');
const newUser = await api.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});
```

## 📖 Basic Usage

### Creating an Instance

```typescript
import { createFetchX } from 'fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0',
  },
  credentials: 'include', // Include cookies in requests
});
```

### Making Requests

```typescript
// GET request
const users = await api.get('/users');

// GET with query parameters
const filteredUsers = await api.get('/users', {
  params: { page: 1, limit: 10, status: 'active' },
});

// POST request with body
const newUser = await api.post('/users', {
  name: 'Jane Doe',
  email: 'jane@example.com',
});

// PUT request
const updatedUser = await api.put('/users/123', {
  name: 'Jane Smith',
});

// DELETE request
await api.delete('/users/123');

// PATCH request
const patchedUser = await api.patch('/users/123', {
  status: 'inactive',
});
```

## 🔧 Interceptors

Interceptors allow you to transform requests and responses globally.

### Request Interceptors

```typescript
// Add authentication token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Add request timestamp
api.interceptors.request.use(config => {
  config.headers['X-Request-Time'] = new Date().toISOString();
  return config;
});
```

### Response Interceptors

```typescript
// Handle authentication errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Transform response data
api.interceptors.response.use(response => {
  // Custom response transformation
  return response;
});
```

### Removing Interceptors

```typescript
// Add interceptor and get its ID
const requestId = api.interceptors.request.use(config => {
  config.headers['X-Custom'] = 'value';
  return config;
});

// Remove interceptor
api.interceptors.request.eject(requestId);
```

## ⚙️ Configuration

### FetchXConfig

```typescript
interface FetchXConfig {
  baseURL?: string; // Base URL for all requests
  timeout?: number; // Request timeout in milliseconds (0 = no timeout)
  headers?: Record<string, string>; // Default headers
  credentials?: RequestCredentials; // Credentials mode ('omit' | 'same-origin' | 'include')
}
```

### RequestOptions

```typescript
interface RequestOptions {
  url?: string; // Request URL (relative to baseURL)
  params?: Record<string, any>; // Query parameters
  body?: any; // Request body
  method?: string; // HTTP method
  signal?: AbortSignal; // AbortSignal for request cancellation
  headers?: Record<string, string>; // Request-specific headers
  timeout?: number; // Request-specific timeout
  credentials?: RequestCredentials; // Request-specific credentials
}
```

## 🎯 API Reference

### createFetchX(config?)

Creates a new FetchX instance with optional configuration.

**Parameters:**

- `config?: FetchXConfig` - Optional configuration object

**Returns:** `FetchXInstance`

### Instance Methods

#### GET Request

```typescript
get<T = any>(url: string, options?: RequestOptions): Promise<T>
```

#### POST Request

```typescript
post<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>
```

#### PUT Request

```typescript
put<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>
```

#### DELETE Request

```typescript
delete<T = any>(url: string, options?: RequestOptions): Promise<T>
```

#### PATCH Request

```typescript
patch<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T>
```

#### HEAD Request

```typescript
head<T = any>(url: string, options?: RequestOptions): Promise<T>
```

## 🚨 Error Handling

FetchX provides consistent error handling with detailed error information.

```typescript
try {
  const data = await api.get('/users');
} catch (error) {
  if (error.isAxiosError) {
    console.log('Error config:', error.config);
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);

    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}
```

### Error Types

- **Network Error**: `ERR_NETWORK` - Network connectivity issues
- **Timeout Error**: `ECONNABORTED` - Request timeout
- **HTTP Error**: `ERR_BAD_RESPONSE` - Non-2xx HTTP status codes
- **Abort Error**: `ERR_CANCELED` - Request was aborted

## 💡 Advanced Usage

### Request Cancellation

```typescript
// Create AbortController for request cancellation
const controller = new AbortController();

// Make request with abort signal
const promise = api.get('/users', {
  signal: controller.signal,
});

// Cancel the request
controller.abort();

try {
  const data = await promise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  }
}
```

### Custom Headers

```typescript
// Global headers
const api = createFetchX({
  headers: {
    'X-API-Key': 'your-api-key',
    'User-Agent': 'MyApp/1.0',
  },
});

// Request-specific headers
const data = await api.get('/users', {
  headers: {
    'X-Custom-Header': 'custom-value',
  },
});
```

### File Upload

```typescript
// Upload file with FormData
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'My file');

const result = await api.post('/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
```

### TypeScript Integration

```typescript
// Define API response types
interface ApiResponse<T> {
  data: T;
  message: string;
  status: 'success' | 'error';
}

interface User {
  id: number;
  name: string;
  email: string;
}

// Use with type safety
const response = await api.get<ApiResponse<User[]>>('/users');
const users = response.data; // TypeScript knows this is User[]
```

## 🔄 Migration from Axios

FetchX is designed to be a drop-in replacement for axios in most cases:

```typescript
// Before (axios)
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

// After (FetchX)
import { createFetchX } from 'fetchx';

const api = createFetchX({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

// API usage remains the same
const data = await api.get('/users');
```

### Key Differences

- **Response Format**: FetchX returns the parsed data directly, not wrapped in a `data` property
- **Error Handling**: Errors are thrown directly, not wrapped in a response object
- **Interceptors**: Slightly different interceptor API (see documentation above)

## 🧪 Testing

```typescript
import { createFetchX } from 'fetchx';

// Mock fetch for testing
global.fetch = jest.fn();

const api = createFetchX({
  baseURL: 'https://api.example.com',
});

test('should make GET request', async () => {
  const mockData = { id: 1, name: 'John' };

  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(mockData),
  });

  const result = await api.get('/users/1');
  expect(result).toEqual(mockData);
});
```

## 🚀 Performance

- **Zero Dependencies**: No external runtime dependencies
- **Tree Shaking**: Full ES modules support for optimal bundle size
- **Native Fetch**: Leverages browser's optimized fetch implementation
- **TypeScript**: Compile-time optimizations and type safety

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Git Commit Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. We use the following tools to ensure commit quality:

- **commitizen**: Interactive commit message generation
- **cz-git**: Chinese-friendly commitizen adapter
- **husky**: Git hooks management
- **lint-staged**: Staged files linting
- **@commitlint**: Commit message validation

#### Quick Start

```bash
# Use interactive commit (recommended)
pnpm commit

# Or use git commit directly
git commit -m "feat(core): add request interceptor support"
```

#### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Scopes**: `core`, `interceptors`, `utils`, `types`, `docs`, `tests`, `config`, `deps`

For detailed information, see our [Git Commit Guide](docs/GIT_COMMIT_GUIDE.md).

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/fetchx.git
cd fetchx

# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build the project
pnpm build

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [axios](https://github.com/axios/axios) for its excellent API design
- Built on the modern [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- Powered by [TypeScript](https://www.typescriptlang.org/) for type safety

---

## 🌐 Language

- [English](README.en.md) (Current)
- [中文](README.zh.md)
