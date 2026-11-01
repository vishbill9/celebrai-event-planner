import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Venues from './Venues';
import { api, ApiError, type Venue } from './api';
import type { EventItem } from './types';

const event: EventItem = {
  id: 'e1', title: 'Anniversary', eventType: 'Anniversary', eventDate: '2026-12-20',
  location: 'Chandigarh', guestCount: 30, budgetTotal: 60000, description: '',
  aiPlan: null, aiCreative: null, createdAt: '', updatedAt: '',
};

const venue = (over: Partial<Venue> = {}): Venue => ({
  name: 'Rooftop One', area: 'Sector 10', venueType: 'Rooftop restaurant', rating: 4.4,
  capacityMin: 20, capacityMax: 80, amenities: ['Parking', 'Bar'], priceNote: 'Rs 2,000 per head',
  whyItFits: 'Intimate and scenic.', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rooftop', fits: true,
  ...over,
});

describe('Venues tab', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows venues with capacity, amenities and a Maps link', async () => {
    vi.spyOn(api, 'findVenues').mockResolvedValue({ area: 'Chandigarh', venues: [venue()] });
    render(<Venues event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find venues' }));
    expect(await screen.findByText('Rooftop One')).toBeTruthy();
    expect(screen.getByText('Fits 30 guests')).toBeTruthy();
    expect(screen.getByText('Parking')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'View on Google Maps' });
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('refuses to render a link that is not a Google Maps URL', async () => {
    vi.spyOn(api, 'findVenues').mockResolvedValue({ area: 'Chandigarh', venues: [venue({ mapsUrl: 'javascript:alert(1)' })] });
    render(<Venues event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find venues' }));
    await screen.findByText('Rooftop One');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('explains an empty result instead of failing', async () => {
    vi.spyOn(api, 'findVenues').mockResolvedValue({ area: 'Nowhere', venues: [] });
    render(<Venues event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find venues' }));
    expect(await screen.findByText(/No well-known venues came up near Nowhere/)).toBeTruthy();
  });

  it('shows the server error message', async () => {
    vi.spyOn(api, 'findVenues').mockRejectedValue(new ApiError(400, 'location_needed', 'Add a location first.'));
    render(<Venues event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find venues' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Add a location first.');
  });

  it('reuses earlier results from this browser session', () => {
    sessionStorage.setItem('venues:e1', JSON.stringify({ area: 'Chandigarh', venues: [venue({ name: 'Saved Place' })] }));
    render(<Venues event={event} />);
    expect(screen.getByText('Saved Place')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Find again' })).toBeTruthy();
  });
});
