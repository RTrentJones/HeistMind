import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResourceList } from '../ResourceList';

describe('ResourceList', () => {
  it('shows a spinner while loading', () => {
    render(
      <ResourceList isLoading isEmpty={false} emptyContent='nothing here'>
        <div>row</div>
      </ResourceList>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('row')).not.toBeInTheDocument();
  });

  it('shows the error banner on failure', () => {
    render(
      <ResourceList
        isLoading={false}
        isError
        errorTitle='Load failed.'
        errorText='boom'
        isEmpty={false}
        emptyContent='nothing here'
      >
        <div>row</div>
      </ResourceList>
    );
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(screen.queryByText('row')).not.toBeInTheDocument();
  });

  it('shows the empty content when empty', () => {
    render(
      <ResourceList isLoading={false} isEmpty emptyContent='nothing here'>
        <div>row</div>
      </ResourceList>
    );
    expect(screen.getByText('nothing here')).toBeInTheDocument();
  });

  it('renders the list otherwise', () => {
    render(
      <ResourceList isLoading={false} isEmpty={false} emptyContent='nothing here'>
        <div>row one</div>
        <div>row two</div>
      </ResourceList>
    );
    expect(screen.getByText('row one')).toBeInTheDocument();
    expect(screen.getByText('row two')).toBeInTheDocument();
  });
});
