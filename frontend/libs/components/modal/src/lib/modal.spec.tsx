import { render, screen } from '@testing-library/react';

import { Modal } from './modal';

describe('Modal', () => {
  
  it('renders its current named component and dialog content', async () => {
    render(<Modal isOpen onClose={() => {}} title="Example">Modal content</Modal>);
    expect((await screen.findByRole('dialog')).textContent).toContain('Modal content');
  });
  
});
