import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import AdminSearchField from '../AdminSearchField';

function SearchFieldHarness() {
  const [value, setValue] = useState('');

  return <AdminSearchField value={value} onChange={setValue} placeholder="검색" />;
}

describe('AdminSearchField', () => {
  it('hides the search icon on focus and clears typed text', async () => {
    const user = userEvent.setup();
    const { container } = render(<SearchFieldHarness />);
    const input = screen.getByPlaceholderText('검색');

    expect(container.querySelector('.admin-search-icon')).not.toBeNull();
    expect(screen.queryByRole('button', { name: '검색어 지우기' })).not.toBeInTheDocument();

    await user.click(input);
    expect(container.querySelector('.admin-search-icon')).toBeNull();

    await user.type(input, '재고');
    expect(screen.getByRole('button', { name: '검색어 지우기' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '검색어 지우기' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });
});
