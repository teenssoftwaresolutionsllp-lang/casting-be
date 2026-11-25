import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it.each([undefined, '', '   '])(
    'accepts an omitted or blank email (%s)',
    async (email) => {
      const dto = plainToInstance(RegisterDto, {
        username: 'jane_doe',
        password: 'Password123!',
        role: 'artist',
        mobile: '9876543210',
        age: 28,
        gender: 'Female',
        ...(email === undefined ? {} : { email }),
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );
});
