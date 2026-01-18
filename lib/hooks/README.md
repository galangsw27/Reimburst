# Custom Hooks

## useLocalStorage

A React hook for managing localStorage with Next.js hydration safety.

### Features

- ✅ **Hydration Safe**: Prevents hydration mismatches by deferring localStorage access until after mount
- ✅ **Client-Side Only**: Uses 'use client' directive to ensure client-side execution
- ✅ **Error Handling**: Gracefully handles localStorage errors with try-catch blocks
- ✅ **Type Safe**: Full TypeScript support with generics
- ✅ **Function Updates**: Supports both direct values and updater functions
- ✅ **Fallback Behavior**: Uses initial value when localStorage is unavailable

### Usage

```typescript
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'

function MyComponent() {
  const [value, setValue, mounted] = useLocalStorage('my-key', 'default-value')

  // Wait for mount before rendering content that depends on localStorage
  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <p>Value: {value}</p>
      <button onClick={() => setValue('new-value')}>Update</button>
      <button onClick={() => setValue(prev => prev + '-updated')}>Append</button>
    </div>
  )
}
```

### API

#### Parameters

- `key: string` - The localStorage key to use
- `initialValue: T` - The initial value to use before localStorage is loaded

#### Returns

A tuple containing:
- `storedValue: T` - The current value (initialValue before mount, then localStorage value)
- `setValue: (value: T | ((val: T) => T)) => void` - Function to update the value
- `mounted: boolean` - Whether the component has mounted (localStorage is accessible)

### Implementation Details

#### Hydration Safety

The hook uses a `mounted` state to prevent hydration mismatches:

1. **Initial Render (SSR)**: Returns `initialValue` and `mounted = false`
2. **After Mount (Client)**: Loads from localStorage and sets `mounted = true`
3. **Subsequent Renders**: Uses the loaded value from localStorage

This ensures the server and client render the same content initially, preventing hydration errors.

#### Error Handling

All localStorage operations are wrapped in try-catch blocks:

- **Load Errors**: Logged to console, falls back to initialValue
- **Save Errors**: Logged to console, state is still updated
- **Unavailable localStorage**: Gracefully degrades to in-memory state only

#### Type Safety

The hook uses TypeScript generics to maintain type safety:

```typescript
// String value
const [name, setName] = useLocalStorage<string>('name', 'John')

// Object value
const [user, setUser] = useLocalStorage<User>('user', { id: 1, name: 'John' })

// Array value
const [items, setItems] = useLocalStorage<string[]>('items', [])
```

### Requirements Satisfied

This hook satisfies the following requirements from the Next.js migration spec:

- **6.1**: localStorage-based persistence for reimbursement data
- **6.2**: Client-side only storage operations
- **6.3**: Proper hydration handling for localStorage data
- **6.4**: Load persisted data without hydration errors
- **6.5**: Fallback behavior when localStorage is unavailable

### Testing

To test the hook:

1. Navigate to `/test-localstorage` in the development server
2. Interact with the test interface
3. Refresh the page to verify persistence
4. Check browser console for any errors
5. Inspect localStorage in DevTools

### Related Hooks

- `useReimbursements` - Uses this hook for reimbursement data persistence
- `useAuth` - Uses similar patterns for authentication state

### Notes

- Always check the `mounted` flag before rendering content that depends on localStorage
- The hook automatically handles JSON serialization/deserialization
- localStorage has a size limit (typically 5-10MB), handle quota exceeded errors appropriately
- Consider using this hook for all localStorage operations to maintain consistency
