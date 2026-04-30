import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider } from './context/AppContext';
import SelectProjectScreen from './screens/SelectProjectScreen';
import DraftsScreen from './screens/DraftsScreen';
import NewRequestScreen from './screens/NewRequestScreen';
import ReviewSubmitScreen from './screens/ReviewSubmitScreen';
import AddItemScreen from './screens/AddItemScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="SelectProject" component={SelectProjectScreen} />
          <Stack.Screen name="Drafts" component={DraftsScreen} />
          <Stack.Screen name="NewRequest" component={NewRequestScreen} />
          <Stack.Screen name="ReviewSubmit" component={ReviewSubmitScreen} />
          <Stack.Screen name="AddItem" component={AddItemScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}
