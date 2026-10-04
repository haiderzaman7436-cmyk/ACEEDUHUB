import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './router';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';

import { useEffect } from 'react';
import { cleanupDuplicateFees } from '@/features/fees/feeService';

export function App() {
  useEffect(() => {
    if (localStorage.getItem('cleaned_v2') !== 'true') {
      cleanupDuplicateFees().then((res) => {
        console.log("Cleanup results:", res);
        localStorage.setItem('cleaned_v2', 'true');
        window.location.reload(); // Refresh the page to reflect changes immediately
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </ErrorBoundary>
  );
}
export default App;
