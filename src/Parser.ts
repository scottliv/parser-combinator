import {
  IParser,
  IParserState,
  ParserStateTransformer,
  ParserResult,
  ParserResultTransformer,
  ParserChain,
} from "./IParser";
export const updateParserState = (
  state: IParserState,
  index: number,
  result: ParserResult | ParserResultTransformer
): IParserState => ({
  ...state,
  index,
  result,
});

export const updateParserResult = (
  state: IParserState,
  result: ParserResult | ParserResultTransformer
): IParserState => ({
  ...state,
  result,
});

export const updateParserError = (
  state: IParserState,
  error: ParserResult
): IParserState =>
  ({
    ...state,
    error,
    isError: true,
  } as IParserState);

export class Parser implements IParser {
  public parserStateTransformer: ParserStateTransformer;

  constructor(parserSateTransformer: ParserStateTransformer) {
    this.parserStateTransformer = parserSateTransformer;
  }

  public runParserStateTransformer(targetString: string): IParserState {
    const initialState: IParserState = {
      targetString,
      index: 0,
      result: null,
      isError: false,
      error: "",
    };
    return this.parserStateTransformer(initialState);
  }

  public map(func: ParserResultTransformer) {
    return new Parser((parserState: IParserState) => {
      const nextState = this.parserStateTransformer(parserState);
      if (nextState.isError) {
        return nextState;
      }
      return updateParserResult(nextState, func(nextState.result));
    });
  }

  public chain(func: ParserChain) {
    return new Parser((parserState: IParserState) => {
      const nextState = this.parserStateTransformer(parserState);
      if (nextState.isError) {
        return nextState;
      }
      const nextParser = func(nextState.result);
      return nextParser.parserStateTransformer(nextState);
    });
  }

  public errorMap(func: ParserResultTransformer) {
    return new Parser((parserState: IParserState) => {
      const nextState = this.parserStateTransformer(parserState);
      if (!nextState.isError) {
        return nextState;
      }
      return updateParserError(nextState, func(nextState.error));
    });
  }
}

export const stringParser = (str: string) =>
  new Parser((parserState: IParserState) => {
    const { targetString, index, isError } = parserState;
    if (isError) {
      return parserState;
    }
    const sliced: string = targetString.slice(index);
    if (sliced.length === 0) {
      return updateParserError(parserState, `Unexpected end of input`);
    }
    if (sliced.startsWith(str)) {
      return updateParserState(parserState, index + str.length, str);
    }
    return updateParserError(
      parserState,
      `Tried to match ${str} but got ${targetString}`
    );
  });

const regexParser = (regex: RegExp) =>
  new Parser((parserState) => {
    const { targetString, index, isError } = parserState;
    if (isError) {
      return parserState;
    }
    const sliced: string = targetString.slice(index);
    if (sliced.length === 0) {
      return updateParserError(parserState, `Unexpected end of input`);
    }
    const matched = sliced.match(regex);
    if (matched) {
      return updateParserState(
        parserState,
        index + matched[0].length,
        matched[0]
      );
    }
    return updateParserError(
      parserState,
      `Could not match regular expression at index: ${index}`
    );
  });

export const lettersParser = regexParser(/^[A-Za-z]+/);

export const digitsParser = regexParser(/^[0-9]+/);

export const lettersOrDigits = regexParser(/^[0-9A-Za-z]+/);

export const floatingPoint = regexParser(/[-]?[0-9]*\.?[0-9]+/);

export const sequence = (parsers: (Parser | IParser)[]) =>
  new Parser((parserState: IParserState) => {
    if (parserState.isError) {
      return parserState;
    }
    const results: any[] = [];
    let nextState: IParserState = parserState;
    for (const p of parsers) {
      nextState = p.parserStateTransformer(nextState);
      results.push(nextState.result);
    }
    return updateParserResult(nextState, results);
  });

export const choice = (parsers: Parser[]) =>
  new Parser((parserState: IParserState) => {
    if (parserState.isError) {
      return parserState;
    }
    for (const p of parsers) {
      const nextState = p.parserStateTransformer(parserState);
      if (!nextState.isError) {
        return nextState;
      }
    }
    return updateParserError(parserState, `Unable to match with any parser`);
  });

export const many = (queryParser: Parser) =>
  new Parser((parserState: IParserState) => {
    if (parserState.isError) {
      return parserState;
    }
    const results = [];
    let nextState = parserState;
    let done = false;

    while (!done) {
      const testState = queryParser.parserStateTransformer(nextState);
      if (!testState.isError) {
        results.push(testState.result);
        nextState = testState;
      } else {
        done = true;
      }
    }

    return updateParserResult(nextState, results);
  });

export const many1 = (queryParser: Parser) =>
  new Parser((parserState: IParserState) => {
    if (parserState.isError) {
      return parserState;
    }
    const results = [];
    let nextState = parserState;
    let done = false;

    while (!done) {
      const testState = queryParser.parserStateTransformer(nextState);
      if (!testState.isError) {
        results.push(testState.result);
        nextState = testState;
      } else {
        done = true;
      }
    }

    if (results.length === 0) {
      return updateParserError(
        parserState,
        "many1: unable to match any parser"
      );
    }
    return updateParserResult(parserState, results);
  });

export const between = (leftParser: Parser, rightParser: Parser) => (
  contentParser: Parser
) => {
  return sequence([leftParser, contentParser, rightParser]).map(
    (results: ParserResult) => {
      return Array.isArray(results) ? results[1] : null;
    }
  );
};

export const sepBy = (separatorParser: Parser) => (valueParser: Parser) => {
  return new Parser((parserState) => {
    const results = [];
    let nextState = parserState;

    while (true) {
      const valueState = valueParser.parserStateTransformer(nextState);
      if (valueState.isError) {
        break;
      }
      results.push(valueState.result);
      nextState = valueState;

      const separatorState = separatorParser.parserStateTransformer(nextState);
      if (separatorState.isError) {
        break;
      }
      nextState = separatorState;
    }
    return updateParserResult(nextState, results);
  });
};

export const sepBy1 = (separatorParser: Parser) => (valueParser: Parser) => {
  return new Parser((parserState) => {
    const results = [];
    let nextState = parserState;

    while (true) {
      const valueState = valueParser.parserStateTransformer(nextState);
      if (valueState.isError) {
        break;
      }
      results.push(results.push(valueState.result));
      nextState = valueState;

      const seperatorState = separatorParser.parserStateTransformer(nextState);
      if (seperatorState.isError) {
        break;
      }
      nextState = seperatorState;
    }

    if (results.length === 0) {
      return updateParserError(
        parserState,
        `sepBy1: unable to capture any results`
      );
    }
    return updateParserResult(nextState, results);
  });
};

export const lazy = (parserThunk: () => Parser) =>
  new Parser((parserState) => {
    const returnParser = parserThunk();
    return returnParser.parserStateTransformer(parserState);
  });

export const success = (results: ParserResult) =>
  new Parser((parserState) => {
    return updateParserResult(parserState, results);
  });
export const fail = (errorMessage: ParserResult) =>
  new Parser((parserState) => {
    return updateParserError(parserState, errorMessage);
  });
