import { Meta, moduleMetadata, StoryObj } from "@storybook/angular";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";

import { FormFieldModule } from "../form-field";
import { I18nMockService } from "../utils/i18n-mock.service";

import { BitRangeDirective } from "./range.directive";
import { SliderComponent } from "./slider.component";

export default {
  title: "Component Library/Form/Slider",
  component: SliderComponent,
  decorators: [
    moduleMetadata({
      imports: [FormFieldModule, BitRangeDirective],
      providers: [
        {
          provide: I18nService,
          useFactory: () => {
            return new I18nMockService({
              required: "required",
            });
          },
        },
      ],
    }),
  ],
  args: {
    disabled: false,
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/Zt3YSeb6E6lebAffrNLa0h/Tailwind-Component-Library?node-id=14419-27978&t=CPOZ5rPZ82ylpFTO-4",
    },
  },
} as Meta;

type Story = StoryObj<SliderComponent>;

export const Default: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /*html*/ `
      <bit-slider>
        <bit-label>Choose a value</bit-label>
        <input bitRange type="range" min="0" max="120" />
      </bit-slider>
    `,
  }),
  args: {},
};
