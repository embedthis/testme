/**
    jest-api-objects.tst.ts - Test object and property matchers
    Tests: toHaveProperty, toMatchObject
*/

import {expect} from 'testme'

console.log('Testing Jest/Vitest-compatible expect() API - Object Matchers...')

//  ==================== toHaveProperty ====================

//  toHaveProperty - simple properties
const person = {
    name: 'Alice',
    age: 30,
    city: 'Portland',
}

expect(person).toHaveProperty('name')
expect(person).toHaveProperty('age')
expect(person).toHaveProperty('city')

expect(person).not.toHaveProperty('country')
expect(person).not.toHaveProperty('email')

//  toHaveProperty - with value check
expect(person).toHaveProperty('name', 'Alice')
expect(person).toHaveProperty('age', 30)
expect(person).not.toHaveProperty('name', 'Bob')
expect(person).not.toHaveProperty('age', 25)

//  toHaveProperty - nested properties with dot notation
const user = {
    profile: {
        name: 'Bob',
        contact: {
            email: 'bob@example.com',
            phone: '555-1234',
        },
    },
    settings: {
        theme: 'dark',
    },
}

expect(user).toHaveProperty('profile.name')
expect(user).toHaveProperty('profile.contact.email')
expect(user).toHaveProperty('settings.theme')

expect(user).toHaveProperty('profile.name', 'Bob')
expect(user).toHaveProperty('profile.contact.email', 'bob@example.com')
expect(user).not.toHaveProperty('profile.name', 'Alice')

//  toHaveProperty - array notation
expect(user).toHaveProperty(['profile', 'name'])
expect(user).toHaveProperty(['profile', 'contact', 'email'])
expect(user).toHaveProperty(['profile', 'name'], 'Bob')

//  toHaveProperty - array properties
const data = {
    items: [1, 2, 3],
    users: ['alice', 'bob'],
}

expect(data).toHaveProperty('items')
expect(data).toHaveProperty('users')

//  toHaveProperty - undefined vs missing
const partial = {
    a: 1,
    b: undefined,
}

expect(partial).toHaveProperty('a')
expect(partial).toHaveProperty('b') //  Property exists even if undefined
expect(partial).not.toHaveProperty('c')

//  ==================== toMatchObject ====================

//  toMatchObject - partial object matching
const fullObject = {
    name: 'Charlie',
    age: 35,
    city: 'Seattle',
    country: 'USA',
}

expect(fullObject).toMatchObject({name: 'Charlie'})
expect(fullObject).toMatchObject({name: 'Charlie', age: 35})
expect(fullObject).toMatchObject({city: 'Seattle', country: 'USA'})

expect(fullObject).not.toMatchObject({name: 'Dave'})
expect(fullObject).not.toMatchObject({age: 30})

//  toMatchObject - nested objects
const complex = {
    user: {
        name: 'Dave',
        profile: {
            bio: 'Developer',
            social: {
                twitter: '@dave',
            },
        },
    },
    timestamp: 123456,
}

expect(complex).toMatchObject({
    user: {
        name: 'Dave',
    },
})

expect(complex).toMatchObject({
    user: {
        profile: {
            bio: 'Developer',
        },
    },
})

expect(complex).toMatchObject({
    user: {
        profile: {
            social: {
                twitter: '@dave',
            },
        },
    },
})

expect(complex).not.toMatchObject({
    user: {
        name: 'Eve',
    },
})

//  toMatchObject - arrays in objects
const withArrays = {
    tags: ['javascript', 'typescript', 'bun'],
    counts: [1, 2, 3],
}

expect(withArrays).toMatchObject({tags: ['javascript', 'typescript', 'bun']})
expect(withArrays).toMatchObject({counts: [1, 2, 3]})
expect(withArrays).not.toMatchObject({tags: ['javascript', 'python']})

//  toMatchObject - empty pattern matches everything
expect(fullObject).toMatchObject({})

//  ==================== Combined Tests ====================

//  Using multiple matchers together
const product = {
    id: 123,
    name: 'Widget',
    price: 29.99,
    tags: ['hardware', 'tools'],
    metadata: {
        manufacturer: 'ACME',
        warranty: '1 year',
    },
}

expect(product).toHaveProperty('id')
expect(product).toHaveProperty('name', 'Widget')
expect(product).toHaveProperty('metadata.manufacturer', 'ACME')
expect(product.tags).toContain('hardware')
expect(product.tags).toHaveLength(2)
expect(product).toMatchObject({
    name: 'Widget',
    metadata: {
        manufacturer: 'ACME',
    },
})

//  Complex nested structure
const nestedData = {
    level1: {
        level2: {
            level3: {
                value: 'deep',
            },
        },
    },
}

expect(nestedData).toHaveProperty('level1.level2.level3.value')
expect(nestedData).toHaveProperty('level1.level2.level3.value', 'deep')
expect(nestedData).toMatchObject({
    level1: {
        level2: {
            level3: {
                value: 'deep',
            },
        },
    },
})

console.log('✓ All object Jest API tests passed!')
