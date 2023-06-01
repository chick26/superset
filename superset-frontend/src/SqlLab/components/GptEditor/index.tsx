import React, {
  // useEffect,
  useState,
} from "react";
import { styled, css  } from "@superset-ui/core";
import { Input } from "src/components/Input";
import Button from "src/components/Button";
import { useSelector, useDispatch } from "react-redux";
import { SqlLabRootState } from "src/SqlLab/types";
import { generateGptQuery } from "src/SqlLab/actions/sqlLab";
import useQueryEditor from "src/SqlLab/hooks/useQueryEditor";
import { queryEditorSetSql } from "src/SqlLab/actions/sqlLab";

export interface GPTInputProps {
  queryEditorId: string;
  runGptQuery: (prompt: string) => void;
}

const StyledGptInput = styled.div`
  ${({ theme }) => css`
    display: flex;
    justify-content: space-between;
  `}
`

const GPTInput = ({
  queryEditorId,
}: GPTInputProps) => {

  const [prompt, setPrompt] = useState('')

  const dispatch = useDispatch();

  const handlePromptChange = (e: React.FormEvent<HTMLInputElement>) => {
    // @ts-expect-error
    setPrompt(e.target.value);
  };

  const queryEditor = useQueryEditor(queryEditorId, [
    'id',
    'dbId',
    'sql',
    'schema',
  ]);

  const { tableSample } = useSelector(({ sqlLab }: SqlLabRootState) => {
    const { queries, tables } = sqlLab;
    
    const queriesSuccess = Object.values(queries).map(query => {
      return query.results
    })

    if (queriesSuccess.length === 0 || queriesSuccess.every(query => query === null)) {
      return {
        tableSample: []
      }
    }

    const tableSample = tables
      .filter(
        ({ dataPreviewQueryId, queryEditorId: qeId }) =>
          dataPreviewQueryId &&
          queryEditorId === qeId &&
          queries[dataPreviewQueryId],
      )
      .map(({ name, dataPreviewQueryId }) => ({
        data: queries[dataPreviewQueryId]["results"]?.data,
        tableName: name,
      }));
    return {
      tableSample
    };
  });

  const objectToCsv = (dataObject = {}): string => {
    const header = `${Object.keys(dataObject).join(",")}`;
    const valuesLine = Object.values(dataObject).join(",");

    return `${header}\n${valuesLine}`;
  }

  const constructPrompt = (tableList: string[],  tableColumn: object[]) => {
    let prompt = `I've got ${tableList.length} tables, here are their names and their first row in csv format`
    tableList.forEach((tableName, index) => {
      prompt += `\n${tableName} shows like this: \n${objectToCsv(tableColumn[index])}`
    })
    
    return prompt
  }

  const runGptQuery = async (prompt: string) => {
    const content = await generateGptQuery({
      prompt,
      ...queryEditor
    })

    dispatch(queryEditorSetSql(queryEditor, content));
  }

  const onClick = () => {
    const tableList = tableSample.map(({ tableName }) => tableName)
    const tableColumn = tableSample.map(({ data }) => data[0])
    const presetPrompt = constructPrompt(tableList, tableColumn)
    const standardPrompt = `Please Write a SQL Query that realize the following without any explaination: \n`

    runGptQuery(presetPrompt + standardPrompt + prompt)
  }

  return (
    <StyledGptInput>
        <Input
          className="sdm-input"
          value={prompt}
          onChange={handlePromptChange}
          // disabled={newOrOverwrite !== 1}
        />
        <Button
          onClick={() => {
            onClick()
          }}
          >
          Generate
        </Button> 
    </StyledGptInput>
  ) 
}

export default GPTInput;