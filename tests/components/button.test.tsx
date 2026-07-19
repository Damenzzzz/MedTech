import {render,screen} from '@testing-library/react';import {describe,expect,it} from 'vitest';import {Button} from '@/components/ui/button';
describe('Button',()=>{it('has accessible button semantics',()=>{render(<Button>Continue</Button>);expect(screen.getByRole('button',{name:'Continue'})).toBeEnabled()})});
