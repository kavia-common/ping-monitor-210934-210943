import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Ping Monitor title', () => {
  render(<App />);
  const titleEl = screen.getByText(/Ping Monitor/i);
  expect(titleEl).toBeInTheDocument();
});
