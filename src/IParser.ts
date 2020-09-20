/*
 * This is the general purpose parser used to build the domain specific parsers
 * used to parse the queries. It is a parser combinator that allows for combining general parsers
 * into more specific ones
 */
export interface IParser {
  /**
   * Function passed to constructor that will determine how the parser
   * state is updated
   *
   */
  parserStateTransformer: ParserStateTransformer;

  /**
   * Run the parserStateTransformer on a target string
   *
   * @param target The target string to be parsed
   */
  runParserStateTransformer(target: string): IParserState;

  /**
   * Provide a new parser state transformer to modify the results of a previous parser
   *
   * @param transformerFunction
   *
   * @return IParser
   *
   * This is useful for providing some structure to our results and transforming them from strings and arrays of
   * strings to objects that can be utilized by our search functions
   */
  map(transformerFunction: ParserResultTransformer): IParser;

  /**
   * Provide a new parser based on the results of a previous parser
   *
   * @param transformerFunction
   *
   * @return IParser
   *
   * This is useful for branching and being able to parse arbitrary lengths of input
   */
  chain(transformerFunction: ParserChain): IParser;

  /**
   * Provide a new parser state transformer to modify the error results of a previous parser that errored
   *
   * @param transformerFunction
   *
   * @return IParser
   *
   * This is the same as map but functions on error state.
   */
  errorMap(transformerFunction: ParserResultTransformer): IParser;
}

export type ParserStateTransformer = (
  parserState: IParserState
) => IParserState;

export interface IParserState {
  index: number;
  targetString: string;
  result: ParserResult;
  isError: boolean;
  error: string;
}

export type ParserResultTransformer = (result: ParserResult) => ParserResult;
export type ParserChain = (parserState: ParserResult) => IParser;
export interface IFilterResult {
  key: string;
  op: string;
  value: string | number;
  type: string;
}

export interface IParsedQuery {
  dataSet: {
    kind: string;
    name: string;
  };
  filters: IFilterResult[];
  display: string[];
  order: string;
}
/**
 * This needs to be flexible as we transform parser results to many shapes before finally returning them.
 * Ultimately the query parser, on a successfully parsed query will
 * return a IParsedQuery object that will be used by the search functions
 */
export type ParserResult =
  | IParsedQuery
  | string
  | string[]
  | ParserResultTransformer
  | object
  | IParserResultsArray
  | null;

/**
 * This is a workaround to allow ParserResult to be an array of ParserResults
 */
interface IParserResultsArray extends Array<ParserResult> {}
