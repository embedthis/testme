#!/usr/bin/env bun
// Simple test that should never run because prep fails

import { teq } from 'testme'

teq(1 + 1, 2, 'Math works')
