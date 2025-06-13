import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameClient } from './GameClient'

describe('GameClient', () => {
  it('should render the title', () => {
    render(<GameClient />)
    
    expect(screen.getByText('🐍 Snake Word Arena')).toBeInTheDocument()
  })

  it('should render connection form initially', () => {
    render(<GameClient />)
    
    expect(screen.getByText('Join Game')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })

  it('should render connection status', () => {
    render(<GameClient />)
    
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })
}) 