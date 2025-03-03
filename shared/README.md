# Shared Code

This directory contains code that is shared between the client and server.

## Usage

### In Client
```js
import { API_ROUTES } from '@shared/constants';
import type { Workflow } from '@shared/types';
```

### In Server
```js
const { API_ROUTES } = require('../../shared/constants');
```
