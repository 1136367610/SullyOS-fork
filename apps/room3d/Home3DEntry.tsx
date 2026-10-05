import React, {useState} from 'react';
import Home3DView from './Home3DView';
import HomeDefinitionForm from './HomeDefinitionForm';
import {isHomeDefinition, type HomeDefinition} from './homeDefinition';

type Props = React.ComponentProps<typeof Home3DView> & {onDefinitionChange: (value: HomeDefinition) => void; beforeEnter?: React.ReactNode; onFigures?: () => void};

export default function Home3DEntry({onDefinitionChange, beforeEnter, onFigures, ...props}: Props) {
  const [editing, setEditing] = useState(false);
  const definition = props.character?.homeDefinition;
  const saved = isHomeDefinition(definition) ? definition : undefined;
  if (!saved || editing) return <HomeDefinitionForm value={saved} onBack={() => saved ? setEditing(false) : props.onBack()} onSave={value => {onDefinitionChange(value); setEditing(false);}} />;
  if (beforeEnter) return <>{beforeEnter}</>;
  return <div className="relative h-full w-full">
    <Home3DView {...props} onDefinition={()=>setEditing(true)} onFigures={onFigures}/>
  </div>;
}
