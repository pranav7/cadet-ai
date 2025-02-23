'use server'

import { Client } from '@notionhq/client'
import { NextResponse } from 'next/server'

const notion = new Client({
  auth: process.env.NOTION_API_KEY
})

const DATABASE_ID = process.env.DATABASE_ID as string

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    await notion.pages.create({
      parent: {
        database_id: DATABASE_ID,
      },
      properties: {
        Email: {
          type: 'email',
          email: email
        },
        Status: {
          type: 'select',
          select: {
            name: 'New'
          }
        },
        'Signed Up': {
          type: 'date',
          date: {
            start: new Date().toISOString()
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Email registered successfully'
    })

  } catch (error) {
    console.error('Error creating Notion page:', error)

    return NextResponse.json(
      { error: 'Failed to register email' },
      { status: 500 }
    )
  }
}